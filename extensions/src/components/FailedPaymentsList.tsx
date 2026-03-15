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

import { isAbortError } from "../lib/cache";
import { formatCurrency, formatRetryLabel } from "../lib/formatters";
import {
  getReviewedFailedPaymentIds,
  markFailedPaymentReviewed,
  markFailedPaymentUnreviewed,
} from "../lib/storage";
import { getFailedPayments } from "../lib/stripe-metrics-service";
import { FailedPayment, StripeProject } from "../lib/types";

type FailedPaymentsListProps = {
  project: StripeProject;
};

const EMPTY_STATE_RETRY_DELAYS_MS = [1500, 3000];

function sortFailedPayments(payments: FailedPayment[]) {
  return [...payments].sort(
    (left, right) => Number(left.reviewed) - Number(right.reviewed),
  );
}

function waitWithAbort(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort);
      resolve();
    }, delayMs);

    function handleAbort() {
      clearTimeout(timeoutId);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal.addEventListener("abort", handleAbort, { once: true });
  });
}

export function FailedPaymentsList(props: FailedPaymentsListProps) {
  const [payments, setPayments] = useState<FailedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  async function loadPayments(options?: {
    showSuccessToast?: boolean;
    forceRefresh?: boolean;
  }) {
    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const requestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      for (
        let attempt = 0;
        attempt <= EMPTY_STATE_RETRY_DELAYS_MS.length;
        attempt++
      ) {
        const [livePayments, reviewedIds] = await Promise.all([
          getFailedPayments(props.project, {
            signal: abortController.signal,
            forceRefresh: options?.forceRefresh || attempt > 0,
          }),
          getReviewedFailedPaymentIds(),
        ]);

        if (
          abortController.signal.aborted ||
          requestId !== requestIdRef.current
        ) {
          return;
        }

        const reviewedIdSet = new Set(reviewedIds);
        const nextPayments = sortFailedPayments(
          livePayments.map((payment) => ({
            ...payment,
            reviewed: payment.reviewed || reviewedIdSet.has(payment.id),
          })),
        );

        const shouldRetryEmptyState =
          !nextPayments.length &&
          !props.project.isDemo &&
          !options?.forceRefresh &&
          attempt < EMPTY_STATE_RETRY_DELAYS_MS.length;

        if (shouldRetryEmptyState) {
          await waitWithAbort(
            EMPTY_STATE_RETRY_DELAYS_MS[attempt],
            abortController.signal,
          );
          continue;
        }

        setPayments(nextPayments);

        if (options?.showSuccessToast) {
          await showToast({
            style: Toast.Style.Success,
            title: "Failed payments updated",
          });
        }

        return;
      }
    } catch (loadError) {
      if (isAbortError(loadError) || requestId !== requestIdRef.current) {
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Couldn't load failed payments.",
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    setPayments([]);
    void loadPayments();
  }, [props.project.id]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function handleToggleReviewed(payment: FailedPayment) {
    if (payment.reviewed) {
      await markFailedPaymentUnreviewed(payment.id);
    } else {
      await markFailedPaymentReviewed(payment.id);
    }

    setPayments((currentPayments) =>
      sortFailedPayments(
        currentPayments.map((currentPayment) =>
          currentPayment.id === payment.id
            ? { ...currentPayment, reviewed: !currentPayment.reviewed }
            : currentPayment,
        ),
      ),
    );
  }

  const revenueAtRisk = payments.reduce(
    (total, payment) => total + payment.amount,
    0,
  );
  const isEmptyStripeAccount =
    !payments.length && props.project.secretKey.startsWith("sk_test_");

  if (!isLoading && !payments.length && !error) {
    return (
      <List navigationTitle="Failed Payments">
        <List.EmptyView
          title={
            isEmptyStripeAccount
              ? "No failed payments found in Stripe Test mode"
              : "No failed payments today"
          }
          description={
            isEmptyStripeAccount
              ? "If this is a new test account, add some test invoices or payment attempts in Stripe and refresh."
              : "Your revenue is safe."
          }
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={() =>
                  void loadPayments({
                    showSuccessToast: true,
                    forceRefresh: true,
                  })
                }
              />
              <Action.OpenInBrowser
                title="Open Stripe Dashboard"
                url={props.project.dashboardUrl}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Failed Payments"
      searchBarPlaceholder="Filter customers"
      isShowingDetail={false}
    >
      {error ? (
        <List.EmptyView
          title="Couldn't load failed payments"
          description={error}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={() => void loadPayments({ forceRefresh: true })}
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section
        title="Revenue Risk"
        subtitle={`${payments.length} customers • ${formatCurrency(revenueAtRisk)}`}
      >
        {payments.map((payment) => (
          <List.Item
            key={payment.id}
            icon={
              payment.reviewed
                ? { source: Icon.CheckCircle, tintColor: Color.Green }
                : Icon.ExclamationMark
            }
            title={`${payment.customerName} — ${formatCurrency(payment.amount, payment.currency)}`}
            subtitle={formatRetryLabel(payment.retryAt)}
            accessories={[
              {
                tag: payment.reviewed
                  ? "Reviewed"
                  : payment.status === "retrying"
                    ? "Retry Pending"
                    : "Final Failure",
                icon:
                  payment.status === "retrying"
                    ? Icon.ArrowClockwise
                    : Icon.XMarkCircle,
              },
              { text: payment.reason },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser
                    title="Open in Stripe"
                    url={payment.stripeUrl}
                  />
                  <Action
                    title="Copy Email"
                    icon={Icon.Clipboard}
                    onAction={() => Clipboard.copy(payment.customerEmail)}
                  />
                  <Action
                    title={
                      payment.reviewed ? "Mark Unreviewed" : "Mark Reviewed"
                    }
                    icon={payment.reviewed ? Icon.Undo : Icon.Check}
                    onAction={() => void handleToggleReviewed(payment)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() =>
                      void loadPayments({
                        showSuccessToast: true,
                        forceRefresh: true,
                      })
                    }
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
