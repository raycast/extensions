import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

interface PaymentsListViewProps {
  payments: unknown[];
  isLoading: boolean;
  onRefresh: () => void;
}

interface PaymentRecord {
  id: string;
  type: "send" | "receive";
  amountSats: number;
  status: string;
  timestampRaw?: string;
  timestampDate?: Date;
  feeSats?: number;
  source?: string;
  raw: Record<string, unknown>;
}

const satsFormatter = new Intl.NumberFormat("en-US");

export function PaymentsListView(props: PaymentsListViewProps) {
  const parsed = parsePayments(props.payments);

  return (
    <List
      isLoading={props.isLoading}
      isShowingDetail
      searchBarPlaceholder="Search payments by id, status, or type"
      navigationTitle="Payment History"
    >
      {parsed.map((payment) => (
        <List.Item
          key={payment.id}
          icon={{ source: payment.type === "send" ? Icon.ArrowUp : Icon.ArrowDown, tintColor: iconColor(payment.type) }}
          title={`${toTitle(payment.type)} ${formatSats(payment.amountSats)} sats`}
          subtitle={payment.id}
          keywords={[payment.id, payment.status, payment.type]}
          accessories={buildAccessories(payment)}
          detail={<List.Item.Detail markdown={buildDetailMarkdown(payment)} metadata={buildMetadata(payment)} />}
          actions={
            <ActionPanel>
              <Action title="Refresh Payments" onAction={props.onRefresh} />
              <Action.CopyToClipboard title="Copy Payment ID" content={payment.id} />
              <Action.CopyToClipboard title="Copy Payment JSON" content={JSON.stringify(payment.raw, null, 2)} />
            </ActionPanel>
          }
        />
      ))}
      {parsed.length === 0 ? (
        <List.EmptyView title="No Payments Found" description="No local payment history records yet." />
      ) : null}
    </List>
  );
}

function parsePayments(payments: unknown[]): PaymentRecord[] {
  const records: PaymentRecord[] = [];

  for (const payment of payments) {
    if (!payment || typeof payment !== "object" || Array.isArray(payment)) {
      continue;
    }

    const raw = payment as Record<string, unknown>;
    const id = toStringValue(raw.id);
    const amount = toNumberValue(raw.amount_sats);
    const status = toStringValue(raw.status);

    if (!id || amount === null || !status) {
      continue;
    }

    const type = toType(raw.type);
    const timestampRaw = toStringValue(raw.timestamp) ?? undefined;
    const timestampDate = toDateValue(timestampRaw);

    records.push({
      id,
      type,
      amountSats: amount,
      status,
      timestampRaw,
      timestampDate,
      feeSats: toNumberValue(raw.fee_sats) ?? undefined,
      source: toStringValue(raw.source) ?? undefined,
      raw,
    });
  }

  return records.sort((left, right) => {
    const leftTs = left.timestampDate?.getTime() ?? 0;
    const rightTs = right.timestampDate?.getTime() ?? 0;
    return rightTs - leftTs;
  });
}

function buildAccessories(payment: PaymentRecord): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [{ text: payment.status }];

  if (payment.timestampDate) {
    accessories.push({ date: payment.timestampDate });
  }

  return accessories;
}

function buildMetadata(payment: PaymentRecord) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.Label title="Payment ID" text={payment.id} />
      <List.Item.Detail.Metadata.Label title="Type" text={toTitle(payment.type)} />
      <List.Item.Detail.Metadata.Label title="Status" text={payment.status} />
      <List.Item.Detail.Metadata.Label title="Amount" text={`${formatSats(payment.amountSats)} sats`} />
      {typeof payment.feeSats === "number" ? (
        <List.Item.Detail.Metadata.Label title="Fee" text={`${formatSats(payment.feeSats)} sats`} />
      ) : null}
      {payment.timestampRaw ? <List.Item.Detail.Metadata.Label title="Timestamp" text={payment.timestampRaw} /> : null}
      {payment.source ? <List.Item.Detail.Metadata.Label title="Source" text={payment.source} /> : null}
    </List.Item.Detail.Metadata>
  );
}

function buildDetailMarkdown(payment: PaymentRecord): string {
  const lines = [
    "# Payment",
    `- **ID**: ${payment.id}`,
    `- **Type**: ${toTitle(payment.type)}`,
    `- **Status**: ${payment.status}`,
    `- **Amount**: ${formatSats(payment.amountSats)} sats`,
  ];

  if (typeof payment.feeSats === "number") {
    lines.push(`- **Fee**: ${formatSats(payment.feeSats)} sats`);
  }

  if (payment.timestampRaw) {
    lines.push(`- **Timestamp**: ${payment.timestampRaw}`);
  }

  if (payment.source) {
    lines.push(`- **Source**: ${payment.source}`);
  }

  return lines.join("\n");
}

function formatSats(value: number): string {
  return satsFormatter.format(value);
}

function toType(value: unknown): "send" | "receive" {
  const normalized = toStringValue(value)?.toLowerCase();
  return normalized === "receive" ? "receive" : "send";
}

function toTitle(type: "send" | "receive"): string {
  return type === "send" ? "Send" : "Receive";
}

function iconColor(type: "send" | "receive"): Color {
  return type === "send" ? Color.Orange : Color.Green;
}

function toStringValue(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toDateValue(timestamp: string | undefined): Date | undefined {
  if (!timestamp) {
    return undefined;
  }

  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
