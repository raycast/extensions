import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo } from "react";
import { accountListSections, mapAccountSummary } from "./account-view";
import { EveryApi } from "./api";
import type { AuthSession } from "./auth";
import { HttpClient } from "./http";
import { modelProviderIcon } from "./provider-icons";
import { useSyncQuotaPerUnit } from "./quota";
import { AuthGate } from "./use-auth";
import { apiBase, gatewayOrigin } from "./url";

const DASHBOARD = "https://app.everyapi.ai";

function formatExpiry(unixSeconds: number): string {
  if (!unixSeconds) return "Unknown";
  return new Date(unixSeconds * 1000).toLocaleString();
}

function Overview({
  session,
  signOut,
  origin,
  navigationTitle,
}: {
  session: AuthSession;
  signOut: () => Promise<void>;
  origin: string;
  navigationTitle: string;
}) {
  const quotaPerUnit = useSyncQuotaPerUnit();
  const api = useMemo(
    () =>
      new EveryApi(
        new HttpClient({
          origin,
          auth: session,
        }),
      ),
    [origin, session],
  );
  const { data, error, isLoading, revalidate } = usePromise(() =>
    api.account(),
  );
  const view = data ? mapAccountSummary(data, quotaPerUnit) : undefined;
  const sections = view ? accountListSections(view) : [];

  const actions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
      />
      <Action.OpenInBrowser
        title="Open Wallet"
        url={`${DASHBOARD}/wallet`}
        icon={Icon.Wallet}
      />
      <Action.OpenInBrowser
        title="Open Recent Requests"
        url={`${DASHBOARD}/logs`}
        icon={Icon.List}
      />
      <Action.OpenInBrowser
        // Keep the registered EveryAPI brand casing.

        title="Open EveryAPI Dashboard"
        url={DASHBOARD}
        icon={Icon.AppWindow}
      />
      <Action
        title="Sign out"
        icon={Icon.Logout}
        style={Action.Style.Destructive}
        onAction={signOut}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        view ? `${view.displayName} · Account & Usage` : navigationTitle
      }
      searchBarPlaceholder="Filter usage or models…"
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Account Summary Unavailable"
          description={error instanceof Error ? error.message : undefined}
          actions={actions}
        />
      ) : null}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.rows.map((row) => (
            <List.Item
              key={row.id}
              icon={
                row.id === "balance"
                  ? { source: Icon.Wallet, tintColor: Color.Green }
                  : row.id.startsWith("model:")
                    ? (modelProviderIcon(row.title) ?? Icon.ComputerChip)
                    : {
                        source: Icon.Gauge,
                        tintColor:
                          row.id === "today" ? Color.Blue : Color.Purple,
                      }
              }
              title={row.title}
              subtitle={row.subtitle}
              accessories={[
                {
                  tag: {
                    value: row.value,
                    color:
                      row.id === "balance"
                        ? Color.Green
                        : row.id === "today"
                          ? Color.Blue
                          : row.id === "week"
                            ? Color.Purple
                            : Color.Orange,
                  },
                },
              ]}
              actions={actions}
            />
          ))}
        </List.Section>
      ))}
      {view ? (
        <List.Section title="Account">
          <List.Item
            icon={view.avatarUrl || Icon.Person}
            title={view.username}
            subtitle={`Session expires ${formatExpiry(view.expiresAt)}`}
            accessories={[{ text: view.timezone }]}
            actions={actions}
          />
          <List.Item
            icon={{ source: Icon.Globe, tintColor: Color.Blue }}
            title="Gateway"
            subtitle={origin.replace(/^https?:\/\//, "")}
            actions={actions}
          />
          <List.Item
            icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
            title="Quota Rate"
            subtitle={`${quotaPerUnit.toLocaleString()} = $1`}
            actions={actions}
          />
        </List.Section>
      ) : null}
    </List>
  );
}

export function AccountOverview({
  navigationTitle,
}: {
  navigationTitle: string;
}) {
  const preferences = getPreferenceValues<Preferences>();
  const origin = gatewayOrigin(preferences.baseUrl);
  return (
    <AuthGate apiBase={apiBase(origin)}>
      {({ session, signOut }) => (
        <Overview
          session={session}
          signOut={signOut}
          origin={origin}
          navigationTitle={navigationTitle}
        />
      )}
    </AuthGate>
  );
}
