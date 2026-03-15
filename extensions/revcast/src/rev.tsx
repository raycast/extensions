import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import { FailedPaymentsList } from "./components/FailedPaymentsList";
import { OnboardingDetail } from "./components/OnboardingDetail";
import { useProjects } from "./hooks/useProjects";
import { isAbortError } from "./lib/cache";
import { formatCurrency } from "./lib/formatters";
import { getRevenueSnapshot } from "./lib/stripe-metrics-service";
import { RevenueSnapshot } from "./lib/types";

export default function RevenueSnapshotCommand() {
  const projects = useProjects();
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadSnapshot(options?: {
    showSuccessToast?: boolean;
    forceRefresh?: boolean;
  }) {
    if (!projects.activeProject) {
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestId = ++requestIdRef.current;

    setIsLoadingSnapshot(true);
    setError(null);

    try {
      const nextSnapshot = await getRevenueSnapshot(projects.activeProject, {
        signal: abortController.signal,
        forceRefresh: options?.forceRefresh,
      });

      if (
        abortController.signal.aborted ||
        requestId !== requestIdRef.current
      ) {
        return;
      }

      setSnapshot(nextSnapshot);

      if (options?.showSuccessToast) {
        await showToast({
          style: Toast.Style.Success,
          title: "Metrics updated",
        });
      }
    } catch (loadError) {
      if (isAbortError(loadError) || requestId !== requestIdRef.current) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Couldn't load revenue metrics.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingSnapshot(false);
      }
    }
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!projects.activeProject) {
      return;
    }

    setSnapshot(null);
    void loadSnapshot();
  }, [projects.activeProject?.id]);

  if (!projects.isLoading && !projects.activeProject) {
    return (
      <OnboardingDetail
        onDidSaveProject={projects.saveProject}
        onUseDemo={projects.enableDemoProject}
      />
    );
  }

  function copySnapshot() {
    if (!snapshot || !projects.activeProject) {
      return;
    }

    const summary = [
      `${projects.activeProject.name} revenue snapshot`,
      `Today Revenue: ${formatCurrency(snapshot.todayRevenue, snapshot.currency)}`,
      `MRR: ${formatCurrency(snapshot.mrr, snapshot.currency)}`,
      `New Customers: ${snapshot.newCustomers}`,
      `Failed Payments: ${snapshot.failedPaymentsCount}`,
      `Revenue At Risk: ${formatCurrency(snapshot.revenueAtRisk, snapshot.currency)}`,
    ].join("\n");

    void Clipboard.copy(summary);
  }

  const isEmptyStripeAccount =
    snapshot !== null &&
    snapshot.todayRevenue === 0 &&
    snapshot.mrr === 0 &&
    snapshot.newCustomers === 0 &&
    snapshot.failedPaymentsCount === 0 &&
    snapshot.revenueAtRisk === 0;

  return (
    <List
      isLoading={projects.isLoading || isLoadingSnapshot}
      navigationTitle="Revenue Snapshot"
      searchBarPlaceholder="Revenue snapshot..."
    >
      {error ? (
        <List.EmptyView
          title="Couldn't load Stripe data"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => void loadSnapshot({ forceRefresh: true })}
              />
              <Action
                title="Use Demo Metrics"
                icon={Icon.AppWindow}
                onAction={() => void projects.enableDemoProject()}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {snapshot ? (
        <>
          {isEmptyStripeAccount ? (
            <List.EmptyView
              title="Stripe is connected, but there is no test data yet"
              description="Add test customers, subscriptions, invoices, or payments in Stripe Test mode, then refresh metrics."
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Metrics"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      void loadSnapshot({
                        showSuccessToast: true,
                        forceRefresh: true,
                      })
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open Stripe Dashboard"
                    url={
                      projects.activeProject?.dashboardUrl ??
                      "https://dashboard.stripe.com"
                    }
                  />
                  <Action
                    title="Use Demo Metrics"
                    icon={Icon.AppWindow}
                    onAction={() => void projects.enableDemoProject()}
                  />
                </ActionPanel>
              }
            />
          ) : null}
          <List.Section
            title="Revenue Metrics"
            subtitle={`Stripe • ${projects.activeProject?.name ?? "Project"}`}
          >
            <List.Item
              icon={{ source: Icon.Coins, tintColor: Color.Green }}
              title="Today Revenue"
              subtitle={snapshot.todayRevenueContext}
              accessories={[
                {
                  text: formatCurrency(
                    snapshot.todayRevenue,
                    snapshot.currency,
                  ),
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Metrics"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      void loadSnapshot({
                        showSuccessToast: true,
                        forceRefresh: true,
                      })
                    }
                  />
                  <Action
                    title="Copy Snapshot"
                    icon={Icon.Clipboard}
                    onAction={copySnapshot}
                  />
                  <Action.OpenInBrowser
                    title="Open Stripe Dashboard"
                    url={
                      projects.activeProject?.dashboardUrl ??
                      "https://dashboard.stripe.com"
                    }
                  />
                  {projects.activeProject ? (
                    <Action.Push
                      title="View Failed Payments"
                      target={
                        <FailedPaymentsList project={projects.activeProject} />
                      }
                    />
                  ) : null}
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.LineChart, tintColor: Color.Blue }}
              title="Monthly Recurring Revenue"
              subtitle={snapshot.mrrContext}
              accessories={[
                { text: formatCurrency(snapshot.mrr, snapshot.currency) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Metrics"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      void loadSnapshot({
                        showSuccessToast: true,
                        forceRefresh: true,
                      })
                    }
                  />
                  <Action
                    title="Copy Snapshot"
                    icon={Icon.Clipboard}
                    onAction={copySnapshot}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              icon={{ source: Icon.Person, tintColor: Color.SecondaryText }}
              title="New Customers"
              subtitle={snapshot.newCustomersContext}
              accessories={[{ text: String(snapshot.newCustomers) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Metrics"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      void loadSnapshot({
                        showSuccessToast: true,
                        forceRefresh: true,
                      })
                    }
                  />
                  <Action
                    title="Copy Snapshot"
                    icon={Icon.Clipboard}
                    onAction={copySnapshot}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
          <List.Section title="Revenue Risk">
            <List.Item
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
              title="Failed Payments"
              subtitle={`${formatCurrency(snapshot.revenueAtRisk, snapshot.currency)} at risk`}
              accessories={[{ text: String(snapshot.failedPaymentsCount) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Refresh Metrics"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      void loadSnapshot({
                        showSuccessToast: true,
                        forceRefresh: true,
                      })
                    }
                  />
                  <Action
                    title="Copy Snapshot"
                    icon={Icon.Clipboard}
                    onAction={copySnapshot}
                  />
                  <Action.OpenInBrowser
                    title="Open Stripe Dashboard"
                    url={
                      projects.activeProject?.dashboardUrl ??
                      "https://dashboard.stripe.com"
                    }
                  />
                  {projects.activeProject ? (
                    <Action.Push
                      title="View Failed Payments"
                      target={
                        <FailedPaymentsList project={projects.activeProject} />
                      }
                    />
                  ) : null}
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      ) : null}
    </List>
  );
}
