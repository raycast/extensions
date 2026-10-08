import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { formatMoney } from "../core/money";
import { PROVIDER_LABELS, Sale } from "../providers/types";
import { CommonActions, providerIcon, saleStatusIcon, saleStatusTag } from "./components";
import { formatDateTime } from "./format";
import { SHORTCUTS } from "./shortcuts";

export function saleTitle(sale: Sale): string {
  return sale.customerEmail ?? sale.customerName ?? sale.productName ?? sale.id;
}

/** Detail pane in the stripe/datafast style: List.Item.Detail.Metadata with Label, Separator and TagList. */
export function SaleDetail(props: { sale: Sale }) {
  const { sale } = props;
  const tag = saleStatusTag(sale.status);
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Amount" text={formatMoney(sale.gross)} />
          {sale.refunded ? (
            <List.Item.Detail.Metadata.Label title="Refunded" text={formatMoney(sale.refunded)} />
          ) : null}
          {sale.fee ? <List.Item.Detail.Metadata.Label title="Fee" text={formatMoney(sale.fee)} /> : null}
          {sale.net ? <List.Item.Detail.Metadata.Label title="Net" text={formatMoney(sale.net)} /> : null}
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item text={tag.value} color={tag.color} />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Customer" text={sale.customerName ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Email" text={sale.customerEmail ?? "—"} />
          <List.Item.Detail.Metadata.Label title="Product" text={sale.productName ?? "—"} />
          <List.Item.Detail.Metadata.Label
            title="Type"
            text={sale.isSubscriptionPayment ? "Subscription payment" : "One-time payment"}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Provider"
            text={PROVIDER_LABELS[sale.provider]}
            icon={providerIcon(sale.provider)}
          />
          <List.Item.Detail.Metadata.Label title="Date" text={formatDateTime(sale.createdAt)} />
          <List.Item.Detail.Metadata.Label title="ID" text={sale.id} />
          <List.Item.Detail.Metadata.Link
            title="Dashboard"
            target={sale.url}
            text={`View in ${PROVIDER_LABELS[sale.provider]}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export function SaleItem(props: { sale: Sale; onRefresh?: () => void }) {
  const { sale } = props;
  const label = PROVIDER_LABELS[sale.provider];
  return (
    <List.Item
      icon={saleStatusIcon(sale.status)}
      title={saleTitle(sale)}
      subtitle={sale.productName}
      keywords={[label, sale.productName ?? "", sale.customerName ?? ""].filter(Boolean)}
      accessories={[{ text: formatMoney(sale.gross) }, { date: sale.createdAt }]}
      detail={<SaleDetail sale={sale} />}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={`View in ${label} Dashboard`}
            url={sale.url}
            icon={Icon.Globe}
            shortcut={SHORTCUTS.openDashboard}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Sale ID" content={sale.id} shortcut={SHORTCUTS.copy} />
            {sale.customerEmail ? (
              <Action.CopyToClipboard
                title="Copy Customer Email"
                content={sale.customerEmail}
                shortcut={SHORTCUTS.copyEmail}
              />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Amount"
              content={formatMoney(sale.gross)}
              shortcut={SHORTCUTS.copyAmount}
            />
          </ActionPanel.Section>
          <CommonActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}
