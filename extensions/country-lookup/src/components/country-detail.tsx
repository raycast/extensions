import { Icon, List } from "@raycast/api";
import {
  commonName,
  formatArea,
  formatCallingCodes,
  formatCapitals,
  formatCurrencies,
  formatLanguages,
  formatMemberships,
  formatNumber,
} from "../lib/format";
import type { Country } from "@yusifaliyevpro/countries";

export function CountryDetail({ country }: { country: Country }) {
  const { Label, TagList, Separator } = List.Item.Detail.Metadata;
  const languages = formatLanguages(country);
  const currencies = formatCurrencies(country);
  const memberships = formatMemberships(country);

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
          <Label title="Capital" text={formatCapitals(country)} />
          <Label title="Region" text={[country.region, country.subregion].filter(Boolean).join(" · ") || "—"} />
          <Label title="Population" text={formatNumber(country.population)} icon={Icon.TwoPeople} />
          <Label title="Area" text={formatArea(country)} />
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
          <Label title="Calling Code" text={formatCallingCodes(country)} />
          <Label title="Driving Side" text={country.cars?.driving_side ?? "—"} />
          <Label title="Top-Level Domain" text={country.tlds?.join(", ") || "—"} />
          <Label title="Timezones" text={country.timezones?.join(", ") || "—"} />
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
        </List.Item.Detail.Metadata>
      }
    />
  );
}
