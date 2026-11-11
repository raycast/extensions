import { getPreferenceValues, List } from "@raycast/api";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";
import { deleteSite, getSites } from "./api";
import { EmptyView } from "./components/empty-view";
import { SiteItem } from "./components/site-item";
import { Preferences, Site } from "./interface";

export default function ShowSitesCommand() {
  const preferences = getPreferenceValues<Preferences>();
  const { data, isLoading, mutate } = getSites();
  const [filter, setFilter] = useState("All");

  async function removeItem(item: Site) {
    try {
      await mutate(deleteSite(item), {
        optimisticUpdate(data: { [key: string]: Site[] } | undefined) {
          if (!data) {
            return {};
          }
          return Object.entries(data).reduce((acc: { [key: string]: Site[] }, [section, sites]: [string, Site[]]) => {
            if (!(section in acc)) {
              acc[section] = [];
            }
            acc[section] = [...acc[section], ...sites.filter((site) => site.id !== item.id)];
            return acc;
          }, {});
        },
      });
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Remove Site" });
    }
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
        Object.entries(data).map(([section, sites]) => {
          if (filter !== "All" && section !== filter) {
            return;
          }

          if (!preferences.showGroups || (Object.entries(data).length === 1 && section === "Ungrouped")) {
            return sites.map((entry) => {
              return <SiteItem key={entry.id} entry={entry} onRemoveItem={(item: Site) => removeItem(item)} />;
            });
          }

          return (
            <List.Section key={section} title={section}>
              {sites.map((entry) => {
                return <SiteItem key={entry.id} entry={entry} onRemoveItem={(item: Site) => removeItem(item)} />;
              })}
            </List.Section>
          );
        })}
    </List>
  );
}

function SearchBarAccessories({
  sections,
  onGroupChange,
}: {
  sections: Record<string, Site[]> | undefined;
  onGroupChange: (group: string) => void;
}) {
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
          Object.keys(sections).map((section) => <List.Dropdown.Item key={section} title={section} value={section} />)}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
