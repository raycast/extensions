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
  filterHandoffReceipts,
  RECEIPT_STATUS_FILTER_LABELS,
  ReceiptStatusFilter,
} from "./utils/receipt-filter";
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
  const [status, setStatus] = useState<ReceiptStatusFilter>("all");
  const publisherSession =
    exportState.status === "ready" &&
    (data?.schemaVersion === 2 || data?.schemaVersion === 3)
      ? data.publisherSessionId?.toLowerCase()
      : undefined;
  const records = filterHandoffReceipts(state.receipts, { query, status });
  const hasFilters = query.trim().length > 0 || status !== "all";
  const clearFiltersAction = hasFilters ? (
    <Action
      title="Clear Request Filters"
      icon={Icon.ArrowCounterClockwise}
      onAction={() => {
        setQuery("");
        setStatus("all");
      }}
    />
  ) : null;
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
  const expired = filterHandoffReceipts(state.expiredReceipts, {
    query,
    status,
  });
  const item = (receipt: HandoffReceipt, expired: boolean) => {
    const sameSession =
      receipt.request.publisherSessionId.toLowerCase() === publisherSession;
    const current = state.status === "ready" && !expired && sameSession;
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
                : state.status !== "ready"
                  ? "Cached · Unconfirmed"
                  : `${publisherSession ? "History" : "Unverified"} · ${RECEIPT_PHASE_LABELS[receipt.phase]}`
              : RECEIPT_PHASE_LABELS[receipt.phase],
            tooltip: `${current ? "Result" : "Last recorded result"}: ${RECEIPT_PHASE_LABELS[receipt.phase]} · ${formatDate(receipt.updatedAt) ?? "Unknown time"}`,
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
            {clearFiltersAction}
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
      searchBarAccessory={
        <List.Dropdown
          tooltip="Recorded Request Status"
          value={status}
          storeValue={false}
          onChange={(value) => setStatus(value as ReceiptStatusFilter)}
        >
          {Object.entries(RECEIPT_STATUS_FILTER_LABELS).map(
            ([value, title]) => (
              <List.Dropdown.Item key={value} value={value} title={title} />
            ),
          )}
        </List.Dropdown>
      }
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
              {clearFiltersAction}
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
          title={hasFilters ? "No Matching Requests" : "No Request Receipts"}
          description={
            hasFilters
              ? "Try another search or recorded status, or clear the filters to show all requests."
              : "Only app-owned receipts appear here. URL opening alone does not prove acceptance or completion."
          }
          icon={Icon.Document}
          actions={
            <ActionPanel>
              {clearFiltersAction}
              <ReloadReceiptsAction refresh={refresh} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
