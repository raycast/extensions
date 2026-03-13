import { Fragment } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { Country } from "@/types";
import useExtraFields from "@/hooks/useExtraFields";

export default function CountryListItem({
  country,
  countries,
  showMarkdown,
  toggleMarkdown,
}: {
  country: Country;
  countries: Country[];
  showMarkdown: boolean;
  toggleMarkdown: () => void;
}) {
  const { phone, markdownCoat, keywords, borders, languages, demonyms } = useExtraFields(country, countries);

  return (
    <List.Item
      id={country.cca2}
      title={country.name.common}
      icon={{ source: country.flag ? country.flag : country.flags.png, fallback: "command-icon.png" }}
      keywords={keywords}
      detail={
        <List.Item.Detail
          markdown={showMarkdown ? `<img src="${markdownCoat}" height="185">` : ""}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Official Name" text={country.name.official} />
              <List.Item.Detail.Metadata.Label title="Country Code" text={country.cca2} />
              {country.cca3 && <List.Item.Detail.Metadata.Label title="Country Alpha3 Code" text={country.cca3} />}
              {country.ccn3 && <List.Item.Detail.Metadata.Label title="Country Numeric Code" text={country.ccn3} />}
              {country.capital && (
                <List.Item.Detail.Metadata.Label
                  title={`Capital${country.capital.length > 1 ? "s" : ""}`}
                  text={country.capital.join(", ")}
                />
              )}
              <List.Item.Detail.Metadata.Label title="Continent" text={country.continents.join(", ")} />

              <List.Item.Detail.Metadata.Label
                title="Start of Week"
                text={country.startOfWeek[0].toUpperCase() + country.startOfWeek.substring(1)}
              />

              {country.tld && <List.Item.Detail.Metadata.Label title="TLD" text={country.tld.join(", ")} />}

              {phone && (
                <List.Item.Detail.Metadata.Label title={`Dialup Code${phone.includes(",") ? "s" : ""}`} text={phone} />
              )}
              {country.population > 0 && (
                <List.Item.Detail.Metadata.Label title="Population" text={`${country.population.toLocaleString()}`} />
              )}

              {country.area > 0 && (
                <List.Item.Detail.Metadata.Label title="Area" text={`${country.area.toLocaleString()} km2`} />
              )}

              <List.Item.Detail.Metadata.Label title="Landlocked" text={country.landlocked ? "Yes" : "No"} />

              {demonyms && demonyms.length > 0 ? (
                <Fragment>
                  <List.Item.Detail.Metadata.Separator />
                  {demonyms.length > 1 ? (
                    <List.Item.Detail.Metadata.TagList title="Inhabitants">
                      <List.Item.Detail.Metadata.TagList.Item
                        key={`${demonyms[0]}`}
                        text={demonyms[0]}
                        icon={Icon.Male}
                      />
                      <List.Item.Detail.Metadata.TagList.Item
                        key={`${demonyms[1]}`}
                        text={demonyms[1]}
                        icon={Icon.Female}
                      />
                    </List.Item.Detail.Metadata.TagList>
                  ) : (
                    <List.Item.Detail.Metadata.Label title="Inhabitants" text={demonyms[0]} />
                  )}
                </Fragment>
              ) : null}

              {country.currencies != undefined && <List.Item.Detail.Metadata.Separator />}

              {country.currencies != undefined && Object.entries(country.currencies).length > 1 && (
                <List.Item.Detail.Metadata.Label title="Currencies"></List.Item.Detail.Metadata.Label>
              )}

              {country.currencies != undefined &&
                Object.entries(country.currencies).map(([key, value]) => {
                  return (
                    <Fragment key={key}>
                      <List.Item.Detail.Metadata.Label title={value.name} />
                      <List.Item.Detail.Metadata.Label title="Symbol" text={value.symbol} />
                      <List.Item.Detail.Metadata.Label title="Abbreviation" text={key} />
                    </Fragment>
                  );
                })}

              {languages.length > 0 && (
                <Fragment>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList
                    title={languages.length === 1 ? "Official Language" : "Official Languages"}
                  >
                    {languages.map((language, i) => (
                      <List.Item.Detail.Metadata.TagList.Item key={`${language}-${i}`} text={language} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </Fragment>
              )}

              {borders.length > 0 && (
                <Fragment>
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.TagList title="Borders">
                    {borders.map((border, i) => (
                      <List.Item.Detail.Metadata.TagList.Item key={`${border}-${i}`} text={border} />
                    ))}
                  </List.Item.Detail.Metadata.TagList>
                </Fragment>
              )}

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="UN Member" text={country.unMember ? "Yes" : "No"} />
              <List.Item.Detail.Metadata.Label title="UN Demographic region" text={country.region} />
              <List.Item.Detail.Metadata.Label title="UN Demographic Subregion" text={country.subregion} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action icon={Icon.Eye} title="Toggle Coat of Arms" onAction={toggleMarkdown} />
          {country.maps.googleMaps && (
            <Action.OpenInBrowser title="Open in Google Maps" url={country.maps.googleMaps} />
          )}
          {country.maps.openStreetMaps && (
            <Action.OpenInBrowser title="Open in Openstreet Maps" url={country.maps.openStreetMaps} />
          )}
          <Action.CopyToClipboard icon={Icon.Clipboard} title="Copy Country JSON" content={JSON.stringify(country)} />
        </ActionPanel>
      }
    ></List.Item>
  );
}
