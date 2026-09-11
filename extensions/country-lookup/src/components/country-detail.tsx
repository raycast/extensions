import { Icon, List } from "@raycast/api";
import {
  commonName,
  formatArea,
  formatBoolean,
  formatCallingCodes,
  formatCapitals,
  formatCurrencies,
  formatDayMonth,
  formatDemonym,
  formatLanguages,
  formatMemberships,
  formatNativeNames,
  formatNumber,
  formatNumberFormat,
  formatUnits,
  formatVehicleSigns,
} from "../lib/format";
import type { Country } from "@yusifaliyevpro/countries";

export function CountryDetail({ country, namesByCode }: { country: Country; namesByCode: Map<string, string> }) {
  const { Label, TagList, Separator, Link } = List.Item.Detail.Metadata;
  const languages = formatLanguages(country);
  const currencies = formatCurrencies(country);
  const memberships = formatMemberships(country);
  const borders = country.borders ?? [];
  const continents = country.continents ?? [];

  const markdown = [
    `# ${country.flag?.emoji ?? ""} ${commonName(country)}`.trim(),
    country.flag?.url_png ? `![flag](${country.flag.url_png}?raycast-width=320)` : "",
    country.flag?.description ? `_${country.flag.description}_` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <Label title="Official Name" text={country.names?.official ?? "—"} />
          <Label title="Native Name" text={formatNativeNames(country)} />
          <Label title="Country Code" text={country.codes?.alpha_2 || "—"} />
          <Label title="Alpha-3 Code" text={country.codes?.alpha_3 || "—"} />
          <Label title="Numeric Code" text={country.codes?.ccn3 || "—"} />
          {country.codes?.cioc && <Label title="IOC Code" text={country.codes.cioc} />}
          {country.codes?.fifa && <Label title="FIFA Code" text={country.codes.fifa} />}
          <Separator />
          <Label title="Capital" text={formatCapitals(country)} icon={Icon.Building} />
          <Label title="Region" text={[country.region, country.subregion].filter(Boolean).join(" · ") || "—"} />
          <Label title="Continent" text={continents.length ? continents.join(", ") : "—"} />
          <Label title="Population" text={formatNumber(country.population)} icon={Icon.TwoPeople} />
          <Label title="Area" text={formatArea(country)} />
          <Label title="Landlocked" text={formatBoolean(country.landlocked)} />
          <Label title="Inhabitants" text={formatDemonym(country)} />
          <Label title="Units" text={formatUnits(country)} />
          <Label title="Government" text={country.government_type || "—"} />
          <Separator />
          {languages.length > 0 && (
            <TagList title="Languages">
              {languages.map((language) => (
                <TagList.Item key={language} text={language} />
              ))}
            </TagList>
          )}
          {currencies.length > 0 && (
            <TagList title="Currencies">
              {currencies.map((currency) => (
                <TagList.Item key={currency} text={currency} />
              ))}
            </TagList>
          )}
          <Label title="Calling Code" text={formatCallingCodes(country)} icon={Icon.Phone} />
          <Label title="Start of Week" text={country.date?.start_of_week ?? "—"} />
          <Label title="Academic Year Start" text={formatDayMonth(country.date?.academic_year_start)} />
          <Label title="Fiscal Year Start" text={formatDayMonth(country.date?.fiscal_year_start?.government)} />
          <Label title="Driving Side" text={country.cars?.driving_side ?? "—"} />
          <Label title="Vehicle Signs" text={formatVehicleSigns(country)} />
          <Label title="Number Format" text={formatNumberFormat(country)} />
          <Label title="Top-Level Domain" text={country.tlds?.join(", ") || "—"} />
          <Label title="Timezones" text={country.timezones?.join(", ") || "—"} />
          {borders.length > 0 && (
            <TagList title="Borders">
              {borders.map((border) => (
                <TagList.Item key={border} text={namesByCode.get(border) ?? border} />
              ))}
            </TagList>
          )}
          {memberships.length > 0 && (
            <>
              <Separator />
              <TagList title="Memberships">
                {memberships.map((membership) => (
                  <TagList.Item key={membership} text={membership} />
                ))}
              </TagList>
            </>
          )}
          {(country.links?.wikipedia || country.links?.google_maps || country.links?.official) && (
            <>
              <Separator />
              {country.links?.official && <Link title="Official Website" target={country.links.official} text="Open" />}
              {country.links?.wikipedia && <Link title="Wikipedia" target={country.links.wikipedia} text="Open" />}
              {country.links?.google_maps && (
                <Link title="Google Maps" target={country.links.google_maps} text="Open" />
              )}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
