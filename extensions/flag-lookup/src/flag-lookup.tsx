import { ReactNode, useState, useMemo, useCallback } from "react";
import { ActionPanel, Action, Detail, Grid, Keyboard, LaunchProps, useNavigation } from "@raycast/api";
import {
  findDirectCountryMatch,
  getCountries,
  getCallingCode,
  getNativeName,
  getCurrencySymbols,
  formatArea,
  formatPopulation,
  getCoatOfArmsImage,
  getFlagImage,
  getFlagEmoji,
  getWikipediaUrl,
  Country,
} from "./countries";
import {
  buildTagCatalog,
  getTagsByCategory,
  filterByTags,
  filterByText,
  getCategoryLabel,
  TagDefinition,
  TagCategory,
} from "./search";

export default function Command(props: LaunchProps<{ arguments: Arguments.FlagLookup }>) {
  const initialSearchText = props.arguments.country || "";
  const countries = useMemo(() => getCountries(), []);
  const directMatch = useMemo(
    () => findDirectCountryMatch(countries, initialSearchText),
    [countries, initialSearchText],
  );

  if (directMatch) {
    return <CountryDetails country={directMatch} countries={countries} initialSearchText={initialSearchText} />;
  }

  return <CountryList countries={countries} initialSearchText={initialSearchText} />;
}

export function CountryList({
  countries,
  initialSearchText = "",
  initialFilterKey = "",
  navigationTitle,
  randomizeDefault = true,
}: {
  countries: Country[];
  initialSearchText?: string;
  initialFilterKey?: string;
  navigationTitle?: string;
  randomizeDefault?: boolean;
}) {
  const allCountries = useMemo(() => getCountries(), []);
  const tagCatalog = useMemo(() => buildTagCatalog(allCountries), [allCountries]);
  const tagsByCategory = useMemo(() => getTagsByCategory(tagCatalog), [tagCatalog]);
  const tagByKey = useMemo(() => new Map(tagCatalog.map((t) => [t.key, t])), [tagCatalog]);
  const [searchText, setSearchText] = useState(initialSearchText);
  const [filterKey, setFilterKey] = useState(initialFilterKey);

  const activeTag = filterKey ? tagByKey.get(filterKey) : undefined;

  const randomizedCountries = useMemo(() => {
    const shuffled = [...countries];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }

    return shuffled;
  }, [countries]);

  const filteredCountries = useMemo(() => {
    const hasFilter = !!activeTag;
    const hasText = searchText.trim().length > 0;

    if (!hasFilter && !hasText && randomizeDefault) {
      return randomizedCountries.slice(0, 50);
    }

    if (!hasFilter && !hasText) {
      return countries;
    }

    let result: Country[] = countries;
    if (activeTag) {
      result = filterByTags(result, [activeTag]);
    }
    if (hasText) {
      result = filterByText(result, searchText);
    }
    return result.slice(0, 50);
  }, [countries, randomizedCountries, searchText, activeTag, randomizeDefault]);

  return (
    <Grid
      navigationTitle={navigationTitle}
      columns={3}
      aspectRatio="4/3"
      inset={Grid.Inset.Zero}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search countries"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Filter" value={filterKey} onChange={setFilterKey}>
          <Grid.Dropdown.Item title="All Countries" value="" />
          {Array.from(tagsByCategory.entries()).map(([category, tags]) => (
            <Grid.Dropdown.Section key={category} title={getCategoryLabel(category)}>
              {tags.map((tag) => (
                <Grid.Dropdown.Item key={tag.key} title={`${tag.label}  (${tag.countryCount})`} value={tag.key} />
              ))}
            </Grid.Dropdown.Section>
          ))}
        </Grid.Dropdown>
      }
      throttle
    >
      {filteredCountries.map((country) => (
        <Grid.Item
          key={country.cca3}
          id={country.cca3}
          content={getFlagImage(country) || getFlagEmoji(country.cca2)}
          title={country.name.common}
          subtitle={country.capital?.[0] || "No capital"}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                target={<CountryDetails country={country} countries={allCountries} />}
              />
              <Action.OpenInBrowser title="Open in Wikipedia" url={getWikipediaUrl(country)} />
              <Action.CopyToClipboard title="Copy Flag Emoji" content={getFlagEmoji(country.cca2)} />
              <Action.CopyToClipboard title="Copy Country Name" content={country.name.common} />
              <Action.CopyToClipboard title="Copy Capital" content={country.capital?.[0] || ""} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

export function CountryDetails({
  country,
  countries,
  initialSearchText,
  extraActions,
}: {
  country: Country;
  countries?: Country[];
  initialSearchText?: string;
  extraActions?: ReactNode;
}) {
  const { push } = useNavigation();
  const allCountries = useMemo(() => countries || getCountries(), [countries]);
  const tagCatalog = useMemo(() => buildTagCatalog(allCountries), [allCountries]);

  const findTag = useCallback(
    (category: TagCategory, token: string): TagDefinition | undefined => {
      return tagCatalog.find((t) => t.category === category && t.token === token);
    },
    [tagCatalog],
  );

  const pushFiltered = useCallback(
    (tag: TagDefinition | undefined, title: string) => {
      if (!tag) return;
      push(
        <CountryList
          countries={allCountries}
          initialFilterKey={tag.key}
          navigationTitle={title}
          randomizeDefault={false}
        />,
      );
    },
    [allCountries, push],
  );

  const flagEmoji = getFlagEmoji(country.cca2);
  const googleMapsUrl = country.maps?.googleMaps;
  const openStreetMapsUrl = country.maps?.openStreetMaps;
  const wikipediaUrl = getWikipediaUrl(country);
  const flagImageUrl = getFlagImage(country);
  const emblemImageUrl = getCoatOfArmsImage(country);
  const callingCode = getCallingCode(country);
  const languages = Object.entries(country.languages || {});
  const currencies = Object.entries(country.currencies || {});
  const currencySymbols = getCurrencySymbols(country);
  const languageCount = Object.keys(country.languages || {}).length;
  const languageTitle = languageCount === 1 ? "Language" : "Languages";
  const markdown = [
    `# ${country.name.common}`.trim(),
    flagImageUrl ? `![Flag](${flagImageUrl})` : null,
    emblemImageUrl ? `## Coat of Arms\n<img src="${emblemImageUrl}" alt="Coat of arms" width="180" />` : null,
    // country.flags.alt ? `## Flag Description\n${country.flags.alt}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Official Name" text={country.name.official} />
          {getNativeName(country) ? <Detail.Metadata.Label title="Native Name" text={getNativeName(country)} /> : null}
          <Detail.Metadata.Label title="Capital" text={country.capital?.[0] || "N/A"} />
          <Detail.Metadata.Label title="Population" text={formatPopulation(country.population)} />
          {languages.length ? (
            <Detail.Metadata.TagList title={languageTitle}>
              {languages.map(([code, name]) => (
                <Detail.Metadata.TagList.Item
                  key={code}
                  text={name}
                  onAction={() => {
                    const tag = findTag("language", name.toLowerCase());
                    pushFiltered(tag, `Countries Speaking ${name}`);
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title={languageTitle} text="N/A" />
          )}
          {currencies.length ? (
            <Detail.Metadata.TagList title={currencies.length === 1 ? "Currency" : "Currencies"}>
              {currencies.map(([code, value]) => (
                <Detail.Metadata.TagList.Item
                  key={code}
                  text={value.symbol ? `${value.name} (${code}) ${value.symbol}` : `${value.name} (${code})`}
                  onAction={() => {
                    const tag = findTag("currency", code.toLowerCase());
                    pushFiltered(tag, `Countries Using ${code}`);
                  }}
                />
              ))}
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Currencies" text="N/A" />
          )}
          <Detail.Metadata.TagList title="Region">
            <Detail.Metadata.TagList.Item
              text={country.region}
              onAction={() => {
                const tag = findTag("region", country.region.toLowerCase());
                pushFiltered(tag, `Countries in ${country.region}`);
              }}
            />
          </Detail.Metadata.TagList>
          {country.subregion ? (
            <Detail.Metadata.TagList title="Subregion">
              <Detail.Metadata.TagList.Item
                text={country.subregion}
                onAction={() => {
                  const tag = findTag("subregion", country.subregion!.toLowerCase());
                  pushFiltered(tag, `Countries in ${country.subregion}`);
                }}
              />
            </Detail.Metadata.TagList>
          ) : null}
          {country.area ? <Detail.Metadata.Label title="Area" text={formatArea(country.area)} /> : null}
          {country.tld?.length ? <Detail.Metadata.Label title="TLD" text={country.tld.join(", ")} /> : null}
          {callingCode ? <Detail.Metadata.Label title="Calling Code" text={callingCode} /> : null}
          <Detail.Metadata.Label title="Timezones" text={country.timezones?.join(", ") || "N/A"} />
          {country.car?.side ? (
            <Detail.Metadata.TagList title="Driving Side">
              <Detail.Metadata.TagList.Item
                text={country.car.side}
                onAction={() => {
                  push(
                    <CountryList
                      countries={allCountries.filter((item) => item.car?.side === country.car?.side)}
                      navigationTitle={`Countries Driving on the ${country.car?.side}`}
                      randomizeDefault={false}
                    />,
                  );
                }}
              />
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label title="Driving Side" text="N/A" />
          )}
          {country.borders?.length ? (
            <Detail.Metadata.TagList title="Borders">
              {country.borders.map((border) => {
                const borderingCountry = allCountries.find((item) => item.cca3 === border);

                return (
                  <Detail.Metadata.TagList.Item
                    key={border}
                    text={borderingCountry?.name.common || border}
                    onAction={
                      borderingCountry
                        ? () => push(<CountryDetails country={borderingCountry} countries={allCountries} />)
                        : undefined
                    }
                  />
                );
              })}
            </Detail.Metadata.TagList>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {extraActions}
          {countries ? (
            <Action.Push
              title="Show Search Results"
              target={<CountryList countries={allCountries} initialSearchText={initialSearchText} />}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open in Wikipedia"
            url={wikipediaUrl}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="Copy Flag Emoji"
            content={flagEmoji}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          {currencySymbols ? (
            <Action.CopyToClipboard
              title="Copy Currency Symbol"
              content={currencySymbols}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
            />
          ) : null}
          {googleMapsUrl ? (
            <Action.OpenInBrowser
              title="Open in Google Maps"
              url={googleMapsUrl}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          ) : null}
          {openStreetMapsUrl ? (
            <Action.OpenInBrowser
              title="Open in OpenStreetMap"
              url={openStreetMapsUrl}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
