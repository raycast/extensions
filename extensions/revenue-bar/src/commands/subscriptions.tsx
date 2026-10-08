import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useState } from "react";
import { formatMoney, formatMoneyList } from "../core/money";
import { MRR_RULE } from "../core/mrr";
import { SubscriptionsData, useSubscriptions } from "../hooks/data";
import { displayCurrency } from "../hooks/runtime";
import { useProviders } from "../hooks/useProviders";
import { ProGate } from "../license/gate";
import { PROVIDER_LABELS, Subscription, SubscriptionStatus } from "../providers/types";
import {
  CommonActions,
  NoProvidersEmptyView,
  ProviderErrorItem,
  providerIcon,
  subscriptionStatusTag,
} from "../ui/components";
import { SUBSCRIPTION_STATUS_LABELS, sectionTitle, updatedLabel } from "../ui/format";
import { SHORTCUTS } from "../ui/shortcuts";

const ALL = "all";
const STATUSES: SubscriptionStatus[] = ["active", "trialing", "past_due", "paused", "cancelled"];

function mrrText(data: SubscriptionsData): string {
  if (data.mrrConverted) {
    return [
      formatMoney(data.mrrConverted.total, "kpi"),
      ...data.mrrConverted.unconverted.map((m) => formatMoney(m, "kpi")),
    ].join(" + ");
  }
  return formatMoneyList(data.metrics.mrr, "kpi");
}

function MrrDetail(props: { data: SubscriptionsData }) {
  const { data } = props;
  const notes = data.fxError
    ? `\n\n> Exchange rates are unavailable (${data.fxError}), so MRR is shown per currency.`
    : "";
  return (
    <Detail
      navigationTitle="Monthly Recurring Revenue"
      markdown={`# How MRR Is Calculated\n\n${MRR_RULE}${notes}`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="MRR" text={mrrText(data)} />
          <Detail.Metadata.Label title="By Currency" text={formatMoneyList(data.metrics.mrr)} />
          <Detail.Metadata.Separator />
          {data.results.flatMap((r) =>
            r.ok
              ? [
                  <Detail.Metadata.Label
                    key={r.provider}
                    title={PROVIDER_LABELS[r.provider]}
                    icon={providerIcon(r.provider)}
                    text={formatMoneyList(
                      r.data.filter((s) => s.status === "active" || s.status === "past_due").map((s) => s.mrr),
                      "kpi",
                    )}
                  />,
                ]
              : [],
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Updated" text={updatedLabel(data.fetchedAt)} />
        </Detail.Metadata>
      }
    />
  );
}

function MetricItem(props: {
  title: string;
  value: string;
  icon: { source: Icon; tintColor: Color };
  data: SubscriptionsData;
  onRefresh: () => void;
  subtitle?: string;
}) {
  return (
    <List.Item
      icon={props.icon}
      title={props.title}
      subtitle={props.subtitle}
      accessories={[{ text: { value: props.value, color: Color.PrimaryText } }]}
      actions={
        <ActionPanel>
          <Action.Push title="How MRR Is Calculated" icon={Icon.Sidebar} target={<MrrDetail data={props.data} />} />
          <Action.CopyToClipboard title={`Copy ${props.title}`} content={props.value} />
          <CommonActions onRefresh={props.onRefresh} />
        </ActionPanel>
      }
    />
  );
}

function SubscriptionItem(props: { subscription: Subscription; onRefresh: () => void }) {
  const s = props.subscription;
  const amount = s.amount ? `${formatMoney(s.amount)} ${s.interval ?? ""}`.trim() : undefined;
  return (
    <List.Item
      icon={providerIcon(s.provider)}
      title={s.customerEmail ?? s.id}
      subtitle={s.productName}
      keywords={[s.productName ?? "", s.id]}
      accessories={[
        { tag: subscriptionStatusTag(s.status) },
        { text: `${formatMoney(s.mrr)}/mo`, tooltip: amount ? `Billed ${amount}` : undefined },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={`View in ${PROVIDER_LABELS[s.provider]} Dashboard`}
            url={s.url}
            icon={Icon.Globe}
            shortcut={SHORTCUTS.openDashboard}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Subscription ID" content={s.id} shortcut={SHORTCUTS.copy} />
            {s.customerEmail ? (
              <Action.CopyToClipboard
                title="Copy Customer Email"
                content={s.customerEmail}
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

function StatusDropdown(props: { onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Status" storeValue onChange={props.onChange}>
      <List.Dropdown.Item title="All Statuses" value={ALL} />
      {STATUSES.map((s) => (
        <List.Dropdown.Item key={s} title={SUBSCRIPTION_STATUS_LABELS[s]} value={s} />
      ))}
    </List.Dropdown>
  );
}

function Subscriptions() {
  const providers = useProviders();
  const [status, setStatus] = useState<string>(ALL);
  const currency = displayCurrency(providers.prefs);
  const { data, isLoading, revalidate } = useSubscriptions(providers.activeIds, currency, !providers.isLoading);

  const visible = (data?.subscriptions ?? [])
    .filter((s) => status === ALL || s.status === status)
    .sort((a, b) => b.mrr.amountMinor - a.mrr.amountMinor);

  return (
    <List
      isLoading={isLoading || providers.isLoading}
      navigationTitle="Subscriptions"
      searchBarPlaceholder="Filter by customer or product"
      searchBarAccessory={<StatusDropdown onChange={setStatus} />}
    >
      {providers.configured.length === 0 ? <NoProvidersEmptyView /> : null}
      {data ? (
        <List.Section title="This Month" subtitle={updatedLabel(data.fetchedAt)}>
          <MetricItem
            title="MRR"
            icon={{ source: Icon.BankNote, tintColor: Color.Green }}
            value={mrrText(data)}
            data={data}
            onRefresh={revalidate}
          />
          <MetricItem
            title="Active Subscriptions"
            icon={{ source: Icon.Person, tintColor: Color.Purple }}
            value={String(data.metrics.active)}
            subtitle={data.metrics.trialing > 0 ? `${data.metrics.trialing} trialing` : undefined}
            data={data}
            onRefresh={revalidate}
          />
          <MetricItem
            title="New This Month"
            icon={{ source: Icon.Plus, tintColor: Color.Green }}
            value={String(data.metrics.newThisMonth)}
            data={data}
            onRefresh={revalidate}
          />
          <MetricItem
            title="Churned This Month"
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Orange }}
            value={String(data.metrics.churnedThisMonth)}
            data={data}
            onRefresh={revalidate}
          />
        </List.Section>
      ) : null}
      {(data?.results ?? []).map((result) =>
        result.ok ? (
          <List.Section
            key={result.provider}
            title={sectionTitle(
              PROVIDER_LABELS[result.provider],
              visible.filter((s) => s.provider === result.provider).length,
            )}
          >
            {visible
              .filter((s) => s.provider === result.provider)
              .map((s) => (
                <SubscriptionItem key={s.id} subscription={s} onRefresh={revalidate} />
              ))}
          </List.Section>
        ) : (
          <ProviderErrorItem
            key={result.provider}
            provider={result.provider}
            error={result.error}
            onRetry={revalidate}
          />
        ),
      )}
      {(data?.unsupported ?? []).map((id) => (
        <List.Section key={id} title={PROVIDER_LABELS[id]}>
          <List.Item
            icon={providerIcon(id)}
            title={PROVIDER_LABELS[id]}
            subtitle="The Gumroad API does not list subscriptions across products"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Gumroad" url="https://gumroad.com/customers" />
              </ActionPanel>
            }
          />
        </List.Section>
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <ProGate feature="Subscriptions" navigationTitle="Subscriptions">
      <Subscriptions />
    </ProGate>
  );
}
