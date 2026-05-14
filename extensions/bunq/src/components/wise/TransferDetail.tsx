/**
 * Transfer detail view component.
 */

import { Detail } from "@raycast/api";
import type { TransferWiseTransfer } from "../../api/endpoints";
import { formatCurrency, formatDate } from "../../lib/formatters";
import { getTransferWiseStatusAppearance } from "../../lib/status-helpers";
import type { TransferWiseStatus } from "../../lib/constants";

interface TransferDetailProps {
  transfer: TransferWiseTransfer;
}

export function TransferDetail({ transfer }: TransferDetailProps) {
  const statusAppearance = getTransferWiseStatusAppearance((transfer.status || "PENDING") as TransferWiseStatus);
  const sourceAmount = transfer.amount_source
    ? formatCurrency(transfer.amount_source.value, transfer.amount_source.currency)
    : "N/A";
  const targetAmount = transfer.amount_target
    ? formatCurrency(transfer.amount_target.value, transfer.amount_target.currency)
    : "N/A";

  const markdown = `# Transfer Details

## Amount Sent
**${sourceAmount}**

## Amount Received
**${targetAmount}**

---

**Status:** ${statusAppearance.label}

${transfer.rate ? `**Exchange Rate:** ${transfer.rate}` : ""}

${transfer.reference ? `**Reference:** ${transfer.reference}` : ""}

${transfer.time_delivery_estimate ? `**Estimated Delivery:** ${formatDate(transfer.time_delivery_estimate)}` : ""}
`;

  return (
    <Detail
      navigationTitle="Transfer Details"
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Sent" text={sourceAmount} />
          <Detail.Metadata.Label title="Received" text={targetAmount} />
          <Detail.Metadata.Label
            title="Status"
            text={{ value: statusAppearance.label, color: statusAppearance.color }}
          />
          <Detail.Metadata.Separator />
          {transfer.rate && <Detail.Metadata.Label title="Rate" text={transfer.rate} />}
          {transfer.reference && <Detail.Metadata.Label title="Reference" text={transfer.reference} />}
          {transfer.pay_in_reference && (
            <Detail.Metadata.Label title="Pay-in Reference" text={transfer.pay_in_reference} />
          )}
          <Detail.Metadata.Separator />
          {transfer.created && <Detail.Metadata.Label title="Created" text={formatDate(transfer.created)} />}
          {transfer.time_delivery_estimate && (
            <Detail.Metadata.Label title="Est. Delivery" text={formatDate(transfer.time_delivery_estimate)} />
          )}
        </Detail.Metadata>
      }
    />
  );
}
