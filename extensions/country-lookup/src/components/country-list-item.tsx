import { Icon, List } from "@raycast/api";
import { commonName, formatDemonym, formatNumber } from "../lib/format";
import { CountryActions } from "./country-actions";
import { CountryDetail } from "./country-detail";
import type { Country } from "@yusifaliyevpro/countries";

export function CountryListItem({
  country,
  showingDetail,
  namesByCode,
  onToggleDetail,
  onRefresh,
}: {
  country: Country;
  showingDetail: boolean;
  namesByCode: Map<string, string>;
  onToggleDetail: () => void;
  onRefresh: () => void;
}) {
  return (
    <List.Item
      icon={country.flag?.url_png ? { source: country.flag.url_png } : Icon.Globe}
      title={commonName(country)}
      subtitle={showingDetail ? undefined : country.names?.official}
      keywords={[
        country.names?.official,
        ...(country.names?.alternates ?? []),
        country.codes?.alpha_2,
        country.codes?.alpha_3,
        country.codes?.ccn3,
        country.region,
        country.subregion,
        formatDemonym(country),
        ...(country.continents ?? []),
        ...(country.capitals?.map((c) => c.name) ?? []),
        ...(country.languages?.map((l) => l.name) ?? []),
        ...(country.currencies?.map((c) => c.name) ?? []),
        ...(country.tlds ?? []),
      ].filter((k): k is string => Boolean(k) && k !== "—")}
      accessories={
        showingDetail
          ? undefined
          : [{ text: country.region, icon: Icon.Map }, { tag: formatNumber(country.population) }]
      }
      detail={<CountryDetail country={country} namesByCode={namesByCode} />}
      actions={
        <CountryActions
          country={country}
          namesByCode={namesByCode}
          onToggleDetail={onToggleDetail}
          onRefresh={onRefresh}
        />
      }
    />
  );
}
