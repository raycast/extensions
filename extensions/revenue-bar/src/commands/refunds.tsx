import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { formatMoney, formatMoneyList, sumByCurrency } from "../core/money";
import { useRefunds } from "../hooks/data";
import { useProviders } from "../hooks/useProviders";
import { ProGate } from "../license/gate";
import { PROVIDER_LABELS, Refund, RefundKind } from "../providers/types";
import { CommonActions, NoProvidersEmptyView, ProviderErrorItem, providerIcon, refundKindIcon } from "../ui/components";
import { REFUND_KIND_LABELS, sectionTitle, updatedLabel } from "../ui/format";
import { SHORTCUTS } from "../ui/shortcuts";

const SECTIONS: Array<{ kind: RefundKind; title: string }> = [
  { kind: "refund", title: "Refunds" },
  { kind: "dispute", title: "Disputes" },
  { kind: "chargeback", title: "Chargebacks" },
];

function RefundItem(props: { refund: Refund; onRefresh: () => void }) {
  const r = props.refund;
  const label = PROVIDER_LABELS[r.provider];
  return (
    <List.Item
      icon={refundKindIcon(r.kind)}
      title={r.customerEmail ?? r.saleId ?? r.id}
      subtitle={r.reason}
      keywords={[label, r.reason ?? "", r.status ?? ""].filter(Boolean)}
      accessories={[
        { icon: providerIcon(r.provider), tooltip: label },
        ...(r.status ? [{ tag: r.status.replace(/_/g, " ") }] : []),
        { text: formatMoney(r.amount) },
        { date: r.createdAt },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={`View in ${label} Dashboard`}
            url={r.url}
            icon={Icon.Globe}
            shortcut={SHORTCUTS.openDashboard}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title={`Copy ${REFUND_KIND_LABELS[r.kind]} ID`}
              content={r.id}
              shortcut={SHORTCUTS.copy}
            />
            <Action.CopyToClipboard
              title="Copy Amount"
              content={formatMoney(r.amount)}
              shortcut={SHORTCUTS.copyAmount}
            />
            {r.customerEmail ? (
              <Action.CopyToClipboard
                title="Copy Customer Email"
                content={r.customerEmail}
                shortcut={SHORTCUTS.copyEmail}
              />
            ) : null}
          </ActionPanel.Section>
          <CommonActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function Refunds() {
  const providers = useProviders();
  const { data, isLoading, revalidate } = useRefunds(providers.activeIds, !providers.isLoading);
  const refunds = data?.refunds ?? [];

  return (
    <List
      isLoading={isLoading || providers.isLoading}
      navigationTitle="Refunds and Disputes · Last 30 Days"
      searchBarPlaceholder="Filter by customer, reason or provider"
    >
      {providers.configured.length === 0 ? (
        <NoProvidersEmptyView />
      ) : (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Refunds or Disputes"
          description="Nothing in the last 30 days."
        />
      )}
      {(data?.results ?? []).map((r) =>
        r.ok ? null : <ProviderErrorItem key={r.provider} provider={r.provider} error={r.error} onRetry={revalidate} />,
      )}
      {SECTIONS.map(({ kind, title }) => {
        const items = refunds.filter((r) => r.kind === kind);
        if (items.length === 0) return null;
        return (
          <List.Section
            key={kind}
            title={sectionTitle(title, items.length)}
            subtitle={`${formatMoneyList(sumByCurrency(items.map((r) => r.amount)))} · ${updatedLabel(data?.fetchedAt) ?? ""}`}
          >
            {items.map((r) => (
              <RefundItem key={`${r.provider}-${r.id}`} refund={r} onRefresh={revalidate} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <ProGate feature="Refunds and disputes" navigationTitle="Refunds and Disputes">
      <Refunds />
    </ProGate>
  );
}
