import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { CommonActions, EmptyState, healthColor, ToggleDetailsAction } from "./components/common";
import { useState } from "react";
import { ErrorView, withSynci } from "./components/session";
import { useConnections } from "./hooks/use-data";
import { APP_URL } from "./lib/config";
import { connectionState } from "./lib/finance";
import { dateLabel, markdown } from "./lib/format";
import type { FinancialConnection } from "./lib/types";

function ConnectionItem({
  connection,
  refresh,
  showDetails,
  onToggleDetails,
}: {
  connection: FinancialConnection;
  refresh: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
}) {
  const state = connectionState(connection);
  const name = connection.institution?.name || `Connection ${connection.id}`;
  const section =
    connection.institution?.category === "CRYPTO"
      ? "crypto"
      : connection.institution?.category === "BROKERAGE"
        ? "brokerages"
        : "banks";
  const url = `${APP_URL}/${section}/connections/${connection.id}`;
  return (
    <List.Item
      title={name}
      id={String(connection.id)}
      icon={{
        source: state.severity >= 2 ? Icon.ExclamationMark : Icon.CheckCircle,
        tintColor: healthColor(state.severity),
      }}
      accessories={[{ tag: { value: state.label, color: healthColor(state.severity) } }]}
      keywords={[state.label, connection.status || ""]}
      detail={
        <List.Item.Detail
          markdown={`# ${markdown(name)}\n\n${markdown(state.message)}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.TagList title="Health">
                <List.Item.Detail.Metadata.TagList.Item text={state.label} color={healthColor(state.severity)} />
              </List.Item.Detail.Metadata.TagList>
              <List.Item.Detail.Metadata.Label
                title="Connection"
                text={connection.status?.replace(/_/g, " ") || "Not reported"}
              />
              <List.Item.Detail.Metadata.Label
                title="Accounts"
                text={
                  connection.financial_accounts_count != null
                    ? String(connection.financial_accounts_count)
                    : "Not reported"
                }
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Consent Expires"
                text={
                  connection.consent_expires_at ? dateLabel(connection.consent_expires_at, true) : "No expiry reported"
                }
              />
              <List.Item.Detail.Metadata.Label
                title="Accounts Refreshed"
                text={dateLabel(connection.accounts_last_synced_at, true)}
              />
              <List.Item.Detail.Metadata.Label
                title="Last Attempt"
                text={dateLabel(connection.health?.last_attempt_at, true)}
              />
              <List.Item.Detail.Metadata.Label title="Failures" text={String(connection.health?.failure_count ?? 0)} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={state.severity >= 2 ? "Review Connection in Synci" : "Open Connection in Synci"}
            url={url}
          />
          <Action.CopyToClipboard
            title="Copy Connection Status"
            content={`${name}: ${state.label}\n${state.message}\nAccounts refreshed: ${dateLabel(connection.accounts_last_synced_at, true)}`}
          />
          <Action.CopyToClipboard title="Copy Connection Link" content={url} />
          <ToggleDetailsAction showDetails={showDetails} onToggle={onToggleDetails} />
          <CommonActions refresh={refresh} />
        </ActionPanel>
      }
    />
  );
}

function ConnectionStatus() {
  const [showDetails, setShowDetails] = useState(false);
  const toggleDetails = () => setShowDetails((value) => !value);
  const { data, error, isLoading, revalidate } = useConnections();
  const connections = [...(data ?? [])].sort(
    (a, b) =>
      connectionState(b).severity - connectionState(a).severity ||
      (a.institution?.name || "").localeCompare(b.institution?.name || ""),
  );
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetails && !!connections.length && !error}
      searchBarPlaceholder="Find a connection or status…"
    >
      {error ? (
        <ErrorView error={error} retry={revalidate}>
          <ToggleDetailsAction showDetails={showDetails} onToggle={toggleDetails} />
        </ErrorView>
      ) : (
        <>
          {!isLoading && !connections.length && (
            <EmptyState
              title="No Connections"
              description="Connect your first financial institution in Synci to see its status here."
              refresh={revalidate}
            />
          )}
          <List.Section
            title="Needs Attention"
            subtitle={`${connections.filter((connection) => connectionState(connection).severity > 0).length}`}
          >
            {connections
              .filter((connection) => connectionState(connection).severity > 0)
              .map((connection) => (
                <ConnectionItem
                  key={connection.id}
                  connection={connection}
                  refresh={revalidate}
                  showDetails={showDetails}
                  onToggleDetails={toggleDetails}
                />
              ))}
          </List.Section>
          <List.Section
            title="Healthy"
            subtitle={`${connections.filter((connection) => connectionState(connection).severity === 0).length}`}
          >
            {connections
              .filter((connection) => connectionState(connection).severity === 0)
              .map((connection) => (
                <ConnectionItem
                  key={connection.id}
                  connection={connection}
                  refresh={revalidate}
                  showDetails={showDetails}
                  onToggleDetails={toggleDetails}
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
export default withSynci(ConnectionStatus);
