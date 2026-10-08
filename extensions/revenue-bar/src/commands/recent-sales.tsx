import { List } from "@raycast/api";
import { useState } from "react";
import { useSales } from "../hooks/data";
import { useProviders } from "../hooks/useProviders";
import { LockedProviderSection } from "../license/gate";
import { PROVIDER_LABELS, ProviderId } from "../providers/types";
import { NoProvidersEmptyView, ProviderErrorItem, providerIcon } from "../ui/components";
import { sectionTitle, updatedLabel } from "../ui/format";
import { SaleItem } from "../ui/SaleItem";

const RECENT_LIMIT = 50;
const ALL = "all";

function ProviderDropdown(props: { providers: ProviderId[]; onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Provider" storeValue onChange={props.onChange}>
      <List.Dropdown.Item title="All Providers" value={ALL} />
      {props.providers.map((id) => (
        <List.Dropdown.Item key={id} title={PROVIDER_LABELS[id]} value={id} icon={providerIcon(id)} />
      ))}
    </List.Dropdown>
  );
}

export default function RecentSales() {
  const providers = useProviders();
  const [filter, setFilter] = useState<string>(ALL);
  const { data, isLoading, revalidate } = useSales("30d", providers.activeIds, RECENT_LIMIT, !providers.isLoading);

  const sales = (data?.sales ?? []).filter((s) => filter === ALL || s.provider === filter);
  const failed = (data?.results ?? []).filter((r) => !r.ok && (filter === ALL || r.provider === filter));

  return (
    <List
      isLoading={isLoading || providers.isLoading}
      isShowingDetail={sales.length > 0}
      navigationTitle="Recent Sales"
      searchBarPlaceholder="Filter by customer, email or product"
      searchBarAccessory={<ProviderDropdown providers={providers.activeIds} onChange={setFilter} />}
    >
      {providers.configured.length === 0 ? (
        <NoProvidersEmptyView />
      ) : (
        <List.EmptyView title="No Sales in the Last 30 Days" description="New orders show up here as they come in." />
      )}
      {failed.map((r) =>
        r.ok ? null : <ProviderErrorItem key={r.provider} provider={r.provider} error={r.error} onRetry={revalidate} />,
      )}
      <List.Section title={sectionTitle("Last 30 Days", sales.length)} subtitle={updatedLabel(data?.fetchedAt)}>
        {sales.map((sale) => (
          <SaleItem key={`${sale.provider}-${sale.id}`} sale={sale} onRefresh={revalidate} />
        ))}
      </List.Section>
      {filter === ALL ? <LockedProviderSection locked={providers.locked} /> : null}
    </List>
  );
}
