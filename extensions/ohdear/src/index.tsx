import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { deleteSite, getSites } from "./api";
import { EmptyView } from "./components/empty-view";
import { SiteItem } from "./components/site-item";
import { Preferences, Site } from "./interface";

export default function ShowSitesCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, mutate } = getSites();
  const [filter, setFilter] = useState("all");

  async function removeItem(item: Site) {
    await mutate(deleteSite(item), {
      optimisticUpdate(data: { [key: string]: Site[] } | undefined) {
        if (!data) {
          return {};
        }
        return Object.entries(data).reduce((acc: { [key: string]: Site[] }, [section, sites]: [string, Site[]]) => {
          if (!(section in acc)) {
            acc[section] = [];
          }
          acc[section] = [...acc[section], ...sites.filter((site: any) => site.id !== item.id)];
          return acc;
        }, {});
      },
    });
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarAccessory={
        <SearchBarAccessories
          sections={data}
          onGroupChange={(group: string) => {
            setFilter(group);
          }}
        />
      }
    >
      <EmptyView title={data && Object.entries(data).length ? "No Results Found" : "No Sites Added"} />
      {data &&
        Object.entries(data).map((section: any, index: number) => {
          if (filter !== "All" && section[0] !== filter) {
            return;
          }

          if (!preferences.showGroups || (Object.entries(data).length === 1 && section[0] === "Ungrouped")) {
            return Object.values(section[1]).map((entry: any) => {
              return <SiteItem key={entry.id} entry={entry} onRemoveItem={(item: Site) => removeItem(item)} />;
            });
          }

          return (
            <List.Section key={index} title={section[0]}>
              {Object.values(section[1]).map((entry: any) => {
                return <SiteItem key={entry.id} entry={entry} onRemoveItem={(item: Site) => removeItem(item)} />;
              })}
            </List.Section>
          );
        })}
    </List>
  );
}

function SearchBarAccessories({ sections, onGroupChange }: { sections: any; onGroupChange: (group: string) => void }) {
  return (
    <List.Dropdown
      tooltip="Select a Group"
      storeValue={true}
      onChange={(newValue) => {
        onGroupChange(newValue);
      }}
    >
      <List.Dropdown.Section title="Groups">
        <List.Dropdown.Item key={0} title={"All"} value={"All"} />
        {sections &&
          Object.entries(sections).map((section: any, index: number) => (
            <List.Dropdown.Item key={index} title={section[0]} value={section[0]} />
          ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
