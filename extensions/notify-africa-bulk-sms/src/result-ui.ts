import type { BulkSendResponse } from "./api.js";

export type PersonalizedSmsResult = {
  recipient: string;
  outcome: string;
  messageId?: string;
};

export function bulkResultMarkdown(result: BulkSendResponse): string {
  const status = result.rejectedCount > 0 ? "Sent with some rejected messages" : "Batch accepted by Notify Africa";
  const messageIdRows = result.results
    .map((item, index) => ({ index: index + 1, messageId: item.messageId }))
    .filter((item) => item.messageId)
    .map((item) => `| ${item.index} | \`${escapeTableCell(item.messageId ?? "")}\` |`)
    .join("\n");

  return `# SMS Send Summary

> ${status}

## Delivery

| Metric | Value |
| --- | ---: |
| Accepted | ${formatNumber(result.acceptedCount)} |
| Rejected | ${formatNumber(result.rejectedCount)} |
| Credits deducted | ${formatNumber(result.creditsDeducted)} |
| Balance remaining | ${formatNumber(result.remainingBalance)} |

## Message IDs

${
  messageIdRows
    ? `| # | Message ID |
| ---: | --- |
${messageIdRows}`
    : "No message IDs were returned for this request."
}`;
}

export function personalizedResultsMarkdown(results: PersonalizedSmsResult[]): string {
  const accepted = results.filter((result) => result.outcome === "Accepted");
  const failed = results.length - accepted.length;
  const rows = results
    .map((result, index) => {
      const status = result.outcome === "Accepted" ? "Accepted" : "Failed";
      const detail =
        result.outcome === "Accepted" ? (result.messageId ?? "Accepted without message ID") : result.outcome;

      return `| ${index + 1} | ${result.recipient} | ${status} | ${escapeTableCell(detail)} |`;
    })
    .join("\n");

  return `# Personalized SMS Summary

> ${accepted.length === results.length ? "All messages were accepted." : "Some messages need attention."}

## Delivery

| Metric | Value |
| --- | ---: |
| Accepted | ${formatNumber(accepted.length)} |
| Failed | ${formatNumber(failed)} |
| Total | ${formatNumber(results.length)} |

## Recipients

| # | Recipient | Status | Detail |
| ---: | --- | --- | --- |
${rows}`;
}

export function importPreviewMarkdown(recipients: string[]): string {
  const rows = recipients
    .slice(0, 10)
    .map((recipient, index) => `| ${index + 1} | ${recipient} |`)
    .join("\n");
  const remaining = recipients.length - 10;

  return `# Import Preview

> Ready to send one shared SMS to ${formatNumber(recipients.length)} recipient${recipients.length === 1 ? "" : "s"}.

## Recipients

| # | Phone number |
| ---: | --- |
${rows}
${remaining > 0 ? `\n${formatNumber(remaining)} more recipient${remaining === 1 ? "" : "s"} will be included.` : ""}

## Privacy

The file was parsed locally. It will not be uploaded to Notify Africa.`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat().format(value);
}

function escapeTableCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}
