import { List } from "@raycast/api";
import type { DocumentSummary } from "../../api/types";
import { formatLongDate, formatMoney } from "../../format";

/** Orders carry no maintained delivery date, so they show the billing state instead of a deadline. */
function deadlineRow(document: DocumentSummary, locale: string) {
  if (document.kind === "order") {
    return <List.Item.Detail.Metadata.Label title="Billed" text={document.isUnbilled ? "no" : "yes"} />;
  }

  const title = document.kind === "invoice" ? "Payment due" : "Valid until";
  const deadline = document.kind === "invoice" ? document.dueDate : document.validUntil;
  return (
    <List.Item.Detail.Metadata.Label title={title} text={deadline === null ? "—" : formatLongDate(deadline, locale)} />
  );
}

export function DocumentPanel({ document, locale }: { document: DocumentSummary; locale: string }) {
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text={document.status.label} />
          <List.Item.Detail.Metadata.Label
            title="Date"
            text={document.date === null ? "—" : formatLongDate(document.date, locale)}
          />
          {deadlineRow(document, locale)}
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Net"
            text={formatMoney(document.totalHt, document.currency, locale)}
          />
          <List.Item.Detail.Metadata.Label
            title="Gross"
            text={formatMoney(document.totalTtc, document.currency, locale)}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
