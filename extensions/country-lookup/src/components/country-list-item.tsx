import { Icon, List } from "@raycast/api";
import { commonName, formatNumber } from "../lib/format";
import { CountryActions } from "./country-actions";
import { CountryDetail } from "./country-detail";
import type { Country } from "@yusifaliyevpro/countries";

export function CountryListItem({
  country,
  showingDetail,
  onToggleDetail,
  onRefresh,
}: {
  country: Country;
  showingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      icon={country.flag?.url_png ? { source: country.flag.url_png } : Icon.Globe}
      title={commonName(country)}
      subtitle={showingDetail ? undefined : country.names?.official}
      keywords={[
        country.codes?.alpha_2,
        country.codes?.alpha_3,
        ...(country.capitals?.map((c) => c.name) ?? []),
      ].filter((k): k is string => Boolean(k))}
      accessories={
        showingDetail
          ? undefined
          : [{ text: country.region, icon: Icon.Map }, { tag: formatNumber(country.population) }]
      }
      detail={<CountryDetail country={country} />}
      actions={<CountryActions country={country} onToggleDetail={onToggleDetail} onRefresh={onRefresh} />}
    />
  );
}
