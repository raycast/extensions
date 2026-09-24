import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import {
  RECEIPT_PHASE_LABELS,
  receiptMarkdown,
  receiptTechnicalMarkdown,
  ReloadReceiptsAction,
  RequestTechnicalDetailsAction,
} from "./components/HandoffRequestStatus";
import { HandoffReceipt } from "./utils/receipt-contract";
import {
  countLabel,
  displayText,
  formatDate,
  markdownText,
} from "./utils/display-format";
import { useHandoffReceipts } from "./utils/useHandoffReceipts";
import { useVessloData } from "./utils/useVessloData";

export default function HandoffRequests() {
  const { state, isLoading, refresh } = useHandoffReceipts();
  const { data, state: exportState } = useVessloData();
  const [query, setQuery] = useState("");
  const publisherSession =
    exportState.status === "ready" &&
    (data?.schemaVersion === 2 || data?.schemaVersion === 3)
      ? data.publisherSessionId?.toLowerCase()
      : undefined;
  const match = (receipt: HandoffReceipt) =>
    [
      receipt.request.requestId,
      receipt.request.publisherSessionId,
      receipt.phase,
      receipt.reason,
      ...receipt.targets.flatMap((entry) => [
        entry.target.bundleId,
        entry.target.canonicalPath,
        entry.target.caskToken,
        entry.phase,
        entry.reason,
      ]),
    ].some((value) =>
      value?.toLowerCase().includes(query.trim().toLowerCase()),
    );
  const records = state.receipts
    .filter(match)
    .sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    );
  const groups = publisherSession
    ? [
        {
          title: "Current Session",
          records: records.filter(
            (receipt) =>
              receipt.request.publisherSessionId.toLowerCase() ===
              publisherSession,
          ),
        },
        {
          title: "Earlier Sessions",
          records: records.filter(
            (receipt) =>
              receipt.request.publisherSessionId.toLowerCase() !==
              publisherSession,
          ),
        },
      ]
    : [{ title: "Session Unverified", records }];
  const expired = state.expiredReceipts.filter(match);
  const item = (receipt: HandoffReceipt, expired: boolean) => {
    const current = state.status === "ready" && !expired;
    const warning = `${state.status !== "ready" ? `> ${markdownText(state.reason ?? "Receipt read is unavailable.", 4096)} Cached results are not current confirmation.\n\n` : ""}${expired ? "> Expired receipt. This is history, not current confirmation.\n\n" : ""}${receipt.request.publisherSessionId.toLowerCase() !== publisherSession ? "> This request belongs to a different or unverified export session. It is request history and must not authorize a new request.\n\n" : ""}`;
    return (
      <List.Item
        key={receipt.request.requestId}
        id={receipt.request.requestId}
        title={displayText(
          receipt.targets.map((entry) => entry.target.caskToken).join(", "),
          160,
        )}
        subtitle={new Date(receipt.updatedAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        })}
        icon={
          current && receipt.phase === "completed"
            ? Icon.CheckCircle
            : Icon.Document
        }
        accessories={[
          {
            text: !current
              ? expired
                ? "Expired history"
                : "Cached · Unconfirmed"
              : RECEIPT_PHASE_LABELS[receipt.phase],
            tooltip: formatDate(receipt.updatedAt) ?? "Unknown time",
          },
        ]}
        detail={
          <List.Item.Detail
            markdown={`${warning}${receiptMarkdown(receipt, current)}\n\nThis read-only history never retries, deletes, or executes requests.`}
          />
        }
        actions={
          <ActionPanel>
            <ReloadReceiptsAction refresh={refresh} />
            <RequestTechnicalDetailsAction
              request={receipt.request}
              receipt={receipt}
              markdown={`${warning}${receiptTechnicalMarkdown(receipt, current)}`}
            />
            <Action.CopyToClipboard
              title="Copy Request ID"
              content={receipt.request.requestId}
            />
          </ActionPanel>
        }
      />
    );
  };
  return (
    <List
      isLoading={isLoading}
      isShowingDetail={records.length + expired.length > 0}
      filtering={false}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search requests"
    >
      {state.status !== "ready" && state.status !== "loading" && (
        <List.Item
          id="receipt-read-state"
          title="Receipt Read Unavailable"
          subtitle={state.reason ?? "Results are unconfirmed"}
          icon={Icon.Warning}
          detail={
            <List.Item.Detail
              markdown={`### Receipt Read Unavailable\n\n${markdownText(state.reason, 4096)}\n\nPreviously observed results, if shown, are cached history. Missing receipts do not mean acceptance or completion.`}
            />
          }
          actions={
            <ActionPanel>
              <ReloadReceiptsAction refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
      {groups.map((group) => (
        <List.Section
          key={group.title}
          title={group.title}
          subtitle={`${countLabel(group.records.length, "request")} · Read-only`}
        >
          {group.records.map((receipt) => item(receipt, false))}
        </List.Section>
      ))}
      {expired.length > 0 && (
        <List.Section title="Expired History">
          {expired.map((receipt) => item(receipt, true))}
        </List.Section>
      )}
      {records.length + expired.length === 0 && state.status === "ready" && (
        <List.EmptyView
          title={query ? "No Matching Request Receipts" : "No Request Receipts"}
          description="Only app-owned receipts appear here. URL opening alone does not prove acceptance or completion."
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <ReloadReceiptsAction refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
