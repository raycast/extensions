import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { HandoffRequest, HandoffTarget } from "../utils/handoff-contract";
import { HandoffReceipt, ReceiptPhase } from "../utils/receipt-contract";
import { bindReceipt } from "../utils/receipt-contract";
import { formatDate, markdownText } from "../utils/display-format";
import { useHandoffReceipts } from "../utils/useHandoffReceipts";

export const RECEIPT_PHASE_LABELS: Record<ReceiptPhase, string> = {
  accepted: "Awaiting Review",
  rejected: "Rejected",
  running: "Running",
  verificationPending: "Verification Pending",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};
const PHASE_EXPLANATIONS: Record<ReceiptPhase, string> = {
  accepted:
    "Review and confirm in Vesslo. Execution and completion are not confirmed.",
  rejected:
    "Vesslo rejected the request before execution. Check the target reasons below.",
  running:
    "Vesslo is handling the confirmed request. Terminal waiting and process exit do not prove completion.",
  verificationPending:
    "Awaiting Vesslo verification. Completion is unconfirmed; do not resend the request.",
  completed:
    "Verified by Vesslo for every target in this request. This is the recorded result, not a live version check.",
  failed:
    "At least one target failed, or results are mixed. Check each target below.",
  cancelled:
    "Vesslo reports cancellation before execution or a safe cancellation during its workflow.",
};
export function requestIdentityMarkdown(request: HandoffRequest): string {
  const text = markdownText;
  return `**Request:** ${text(request.requestId)}\n\n**Request schema:** ${request.schemaVersion}${request.schemaVersion === 1 ? "\n\n**Legacy request record:** Read-only. This V1 record cannot authorize a new target-readiness review." : ""}\n\n**Publisher session:** ${text(request.publisherSessionId)}\n\n**Created:** ${text(formatDate(request.createdAt))}\n\n**Inventory / completed check revision:** ${request.inventoryRevision} / ${request.completedCheckRevision}\n\n**Source:** Homebrew`;
}
export function receiptMarkdown(
  receipt: HandoffReceipt,
  current = true,
): string {
  const text = markdownText;
  const targets = receipt.targets
    .map(
      (entry) =>
        `${targetSummaryMarkdown(entry.target)}\n\n**${current ? "Result" : "Last recorded result"}:** ${RECEIPT_PHASE_LABELS[entry.phase]}${current && entry.phase === "completed" ? " · Verified by Vesslo" : ""}${entry.reason && entry.phase !== "completed" ? `\n\n**Reason:** ${text(entry.reason, 4096)}` : ""}`,
    )
    .join("\n\n---\n\n");
  return `### ${current ? RECEIPT_PHASE_LABELS[receipt.phase] : "Historical Receipt"}\n\n${current ? PHASE_EXPLANATIONS[receipt.phase] : "Current result unconfirmed. These are previously recorded results."}\n\n${targets}\n\nUpdated ${text(formatDate(receipt.updatedAt))}${receipt.reason && receipt.phase !== "completed" ? `\n\n**Request reason:** ${text(receipt.reason, 4096)}` : ""}`;
}

function targetSummaryMarkdown(target: HandoffTarget): string {
  const text = (value: string) => markdownText(value, 4096);
  return `**${text(target.caskToken)}**\n\nRequested: ${text(target.installedVersion)} → ${text(target.expectedTargetVersion)}\n\n${text(target.canonicalPath)}`;
}

function targetIdentityMarkdown(target: HandoffTarget): string {
  return `${targetSummaryMarkdown(target)}\n\n**App ID:** ${markdownText(target.appId)}\n\n**Bundle ID:** ${markdownText(target.bundleId, 4096)}${target.readinessEvidenceId ? `\n\n**Readiness evidence:** ${markdownText(target.readinessEvidenceId)}` : ""}`;
}

export function requestTechnicalMarkdown(request: HandoffRequest): string {
  return `### Request Details\n\n${requestIdentityMarkdown(request)}\n\n**Created (original):** ${markdownText(request.createdAt)}\n\n${request.targets.map((target, index) => `### Target ${index + 1}\n\n${targetIdentityMarkdown(target)}`).join("\n\n---\n\n")}`;
}

export function receiptTechnicalMarkdown(
  receipt: HandoffReceipt,
  current = true,
): string {
  const targets = receipt.targets
    .map(
      (entry, index) =>
        `### Target ${index + 1}\n\n${targetIdentityMarkdown(entry.target)}\n\n**${current ? "Result" : "Last recorded result"}:** ${RECEIPT_PHASE_LABELS[entry.phase]}${entry.reason ? `\n\n**Reason:** ${markdownText(entry.reason, 4096)}` : ""}${entry.verificationRecordId ? `\n\n**Verification record:** ${markdownText(entry.verificationRecordId)}` : ""}`,
    )
    .join("\n\n---\n\n");
  return `### Receipt Details\n\n${current ? PHASE_EXPLANATIONS[receipt.phase] : "Historical receipt. Current result unconfirmed."}\n\n**${current ? "Result" : "Last recorded result"}:** ${RECEIPT_PHASE_LABELS[receipt.phase]}${receipt.reason ? `\n\n**Request reason:** ${markdownText(receipt.reason, 4096)}` : ""}\n\n${requestIdentityMarkdown(receipt.request)}\n\n**Created (original):** ${markdownText(receipt.request.createdAt)}\n\n**Receipt schema:** ${receipt.schemaVersion}\n\n**Receipt revision:** ${receipt.revision}\n\n**Received:** ${markdownText(receipt.receivedAt)}\n\n**Updated:** ${markdownText(receipt.updatedAt)}\n\n**Terminal retention expires:** ${markdownText(receipt.expiresAt)}\n\n${targets}`;
}

export function RequestTechnicalDetailsAction({
  request,
  markdown,
  receipt,
}: {
  request: HandoffRequest;
  markdown: string;
  receipt?: HandoffReceipt;
}) {
  return (
    <Action.Push
      title="View Technical Details"
      icon={Icon.Document}
      target={
        <Detail
          navigationTitle="Request Technical Details"
          markdown={`${markdown}\n\nRead-only details. This view never resends or executes a request.`}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                title="Copy Request ID"
                content={request.requestId}
              />
              <Action.CopyToClipboard
                title="Copy Request JSON"
                content={JSON.stringify(request, null, 2)}
              />
              {receipt && (
                <Action.CopyToClipboard
                  title="Copy Receipt JSON"
                  content={JSON.stringify(receipt, null, 2)}
                />
              )}
            </ActionPanel>
          }
        />
      }
    />
  );
}
export function ReloadReceiptsAction({
  refresh,
}: {
  refresh: () => unknown | Promise<unknown>;
}) {
  return (
    <Action
      title="Reload Receipts"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        await refresh();
      }}
    />
  );
}
export function HandoffRequestStatus({ request }: { request: HandoffRequest }) {
  const { state, isLoading, refresh } = useHandoffReceipts();
  const bound = bindReceipt(state, request);
  const warning = bound.reason
    ? `> ${markdownText(bound.reason, 4096)}\n\n`
    : "";
  const markdown = bound.receipt
    ? `${warning}${receiptMarkdown(bound.receipt, bound.status === "current")}`
    : `### ${bound.status === "conflict" ? "Request Conflict" : bound.status === "unavailable" ? "Receipt Unavailable" : "Awaiting Receipt"}\n\n${warning}${request.targets.map(targetSummaryMarkdown).join("\n\n---\n\n")}\n\nThis view never resends or executes a request.`;
  return (
    <Detail
      navigationTitle="Vesslo Request Status"
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ReloadReceiptsAction refresh={refresh} />
          <RequestTechnicalDetailsAction
            request={request}
            receipt={bound.receipt ?? undefined}
            markdown={`${warning}${bound.receipt ? receiptTechnicalMarkdown(bound.receipt, bound.status === "current") : requestTechnicalMarkdown(request)}`}
          />
          <Action.CopyToClipboard
            title="Copy Request ID"
            content={request.requestId}
          />
        </ActionPanel>
      }
    />
  );
}
