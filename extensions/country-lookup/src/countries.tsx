import { Action, ActionPanel, environment, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { getData } from "./api";
import React, { useState } from "react";
import { Preferences } from "./interface";

export default function Countries() {
  const { data, error } = getData();
  const preferences = getPreferenceValues<Preferences>();
  const [showMarkdown, setShowMarkdown] = useState<boolean>(preferences.showCoatOfArms);

  if (error) {
    showToast(Toast.Style.Failure, "An error occured", "Try again later");
  }

  return (
    <List
      isLoading={!data && !error}
      searchBarPlaceholder="Search for name, country code, capital or dialup code"
      isShowingDetail
    >
      <List.EmptyView icon={{ source: "noview.png" }} title="No Results" />
      {(data || []).map((entry) => {
        let phone: string | null = null;
        const keywords = [entry.cca2, entry.cca3];
        if (entry.idd.root && entry.idd.suffixes.length) {
          phone = entry.idd.suffixes
            .map((suffix) => {
              keywords.push(`${entry.idd.root}${suffix}`, `${entry.idd.root.replace("+", "")}${suffix}`);
              return `${entry.idd.root}${suffix}`;
            })
            .join(", ");
        }

        const markdownCoat = entry.coatOfArms.png
          ? entry.coatOfArms.png
          : `file://${environment.assetsPath}/no-image@${environment.appearance}.png`;

        if (entry.capital) {
          entry.capital.forEach((capital) => {
            keywords.push(capital);
          });
        }

        if (entry.tld?.length) {
          keywords.push(...entry.tld);
        }

        return (
          <List.Item
            id={entry.cca2}
            key={entry.cca2}
            title={entry.name.common}
            icon={{ source: entry.flag ? entry.flag : entry.flags.png, fallback: "command-icon.png" }}
            keywords={keywords}
            detail={
              <List.Item.Detail
                markdown={showMarkdown ? `<img src="${markdownCoat}" height="185">` : ""}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Official Name" text={entry.name.official} />
                    <List.Item.Detail.Metadata.Label title="Country Code" text={entry.cca2} />
                    {entry.capital && (
                      <List.Item.Detail.Metadata.Label
                        title={`Capital${entry.capital.length > 1 ? "s" : ""}`}
                        text={entry.capital.join(", ")}
                      />
                    )}
                    <List.Item.Detail.Metadata.Label title="Continent" text={entry.continents.join(", ")} />

                    <List.Item.Detail.Metadata.Label
                      title="Start of Week"
                      text={entry.startOfWeek[0].toUpperCase() + entry.startOfWeek.substring(1)}
                    />

                    {entry.tld && <List.Item.Detail.Metadata.Label title="TLD" text={entry.tld.join(", ")} />}

                    {phone && (
                      <List.Item.Detail.Metadata.Label
                        title={`Dialup Code${phone.includes(",") ? "s" : ""}`}
                        text={phone}
                      />
                    )}
                    {entry.population > 0 && (
                      <List.Item.Detail.Metadata.Label
                        title="Population"
                        text={`${entry.population.toLocaleString()}`}
                      />
                    )}

                    {entry.area > 0 && (
                      <List.Item.Detail.Metadata.Label title="Area" text={`${entry.area.toLocaleString()} km2`} />
                    )}

                    {entry.currencies != undefined && <List.Item.Detail.Metadata.Separator />}

                    {entry.currencies != undefined && Object.entries(entry.currencies).length > 1 && (
                      <List.Item.Detail.Metadata.Label title="Currencies"></List.Item.Detail.Metadata.Label>
                    )}

                    {entry.currencies != undefined &&
                      Object.entries(entry.currencies).map(([key, value]) => {
                        return (
                          <React.Fragment key={key}>
                            <List.Item.Detail.Metadata.Label title={value.name} />
                            <List.Item.Detail.Metadata.Label title="Symbol" text={value.symbol} />
                            <List.Item.Detail.Metadata.Label title="Abbreviation" text={key} />
                          </React.Fragment>
                        );
                      })}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action icon={Icon.Eye} title="Toggle Coat of Arms" onAction={() => setShowMarkdown(!showMarkdown)} />
                {entry.maps.googleMaps && (
                  <Action.OpenInBrowser title="Open in Google Maps" url={entry.maps.googleMaps} />
                )}
                {entry.maps.openStreetMaps && (
                  <Action.OpenInBrowser title="Open in OpenStreet Maps" url={entry.maps.openStreetMaps} />
                )}
              </ActionPanel>
            }
          ></List.Item>
        );
      })}
    </List>
  );
}
