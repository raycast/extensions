import { Action, ActionPanel, List, Image } from "@raycast/api";
import { search } from "./anycoffee-api";
import { Roaster } from "./type";
import { otherCountries, popularCountries } from "./countries";
import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";

export default function Command() {
  const [query, setQuery] = useState<null | string>(null);
  const [roastersByCountry, setRoastersByCountry] = useState<{ [key: string]: Roaster[] }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [countryCode, setCountryCode] = useState<string>("all");
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    async function fetch() {
      setIsLoading(true);
      const roasters = await search(query, countryCode, preferences.coffeeRoasterSort);

      const allTheRest = "All the rest";

      let roastersByCountry: { [key: string]: Roaster[] } = roasters.reduce(
        (group: { [key: string]: Roaster[] }, roaster) => {
          const country = roaster.location?.country ?? allTheRest;
          if (country) {
            if (!group[country]) {
              group[country] = [];
            }
            group[country].push(roaster);
          }
          return group;
        },
        {}
      );

      if (allTheRest in roastersByCountry) {
        const { [allTheRest]: movedItem, ...others } = roastersByCountry;
        roastersByCountry = { ...others, [allTheRest]: movedItem };
      }

      setRoastersByCountry(roastersByCountry);
      setIsLoading(false);
    }
    fetch();
  }, [query, countryCode]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={(text) => setQuery(text)}
      searchBarPlaceholder="Search coffee roasters"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Sort"
          defaultValue="all"
          //storeValue
          onChange={(newValue) => setCountryCode(newValue)}
        >
          <List.Dropdown.Item key="all" title="All" value="all" />
          <List.Dropdown.Section title="Popular countries">
            {popularCountries.map((item, index) => (
              <List.Dropdown.Item key={item.code} title={item.name} value={item.code} />
            ))}
          </List.Dropdown.Section>

          <List.Dropdown.Section title="Countries">
            {otherCountries.map((item, index) => (
              <List.Dropdown.Item key={item.code} title={item.name} value={item.code} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      throttle
    >
      {Object.entries(roastersByCountry).map(([country, roasters]) => (
        <List.Section title={country} key={country}>
          {roasters.map((item, index) => (
            <RoasterListItem key={item.id} item={item} index={index} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function setSubtitle(roaster: Roaster) {
  let subtitle = "";

  if (roaster.location?.state ?? false) {
    subtitle += roaster.location?.state;
  }

  if (roaster.location?.city ?? false) {
    if (subtitle !== "") {
      subtitle += ", ";
    }

    subtitle += roaster.location?.city;
  }

  return subtitle;
}

function setAccessories(roaster: Roaster) {
  const accessories: Array<List.Item.Accessory> = [];
  return accessories;
}

function RoasterListItem(props: { item: Roaster; index: number }) {
  return (
    <List.Item
      title={props.item.name}
      subtitle={setSubtitle(props.item)}
      actions={<Actions item={props.item} />}
      icon={{
        source: props.item.image?.url ?? "",
        mask: Image.Mask.Circle,
      }}
      accessories={setAccessories(props.item)}
    />
  );
}

function Actions(props: { item: Roaster }) {
  return (
    <ActionPanel title={props.item.name}>
      <ActionPanel.Section>
        {props.item.contact?.website && <Action.OpenInBrowser url={props.item.contact.website} />}
        {props.item.contact?.instagram && (
          <Action.OpenInBrowser url={`https://instagram.com/${props.item.contact.instagram}`} title="Open Instagram" />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
