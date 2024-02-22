import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useState } from "react";
import { useSearch } from "./hooks/useSearch";
import { App } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState("all");

  const { isLoading, data, isSetappInstalled } = useSearch(searchText || "", filter);

  console.log("isSetappInstalled", isSetappInstalled);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Setapp apps..."
      searchBarAccessory={<DropdownFilter onFilterChange={(value) => setFilter(value)} />}
      throttle
    >
      <List.Section title="Results" subtitle={data?.length + ""}>
        {data?.map((app: App) => {
          return <SearchListItem key={`${app.type}-${app.name}`} app={app} setappInstalled={isSetappInstalled} />;
        })}
      </List.Section>
    </List>
  );
}

function DropdownFilter(props: { onFilterChange: (newValue: string) => void }) {
  const { onFilterChange } = props;
  return (
    <List.Dropdown
      tooltip="Filter by installed status"
      storeValue={true}
      onChange={(newValue) => onFilterChange(newValue)}
    >
      <List.Dropdown.Item title="All" value="all" />
      <List.Dropdown.Section title="Filter by installed status">
        <List.Dropdown.Item title="Installed" value="installed" />
        <List.Dropdown.Item title="Not Installed" value="not-installed" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Filter by app type">
        <List.Dropdown.Item title="Mobile Apps" value="mobile-apps" />
        <List.Dropdown.Item title="Desktop Apps" value="desktop-apps" />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function SearchListItem({ app, setappInstalled }: { app: App; setappInstalled: boolean }) {
  const accessories = [];
  if (app.installed) {
    accessories.push({ tag: { value: "Installed", color: Color.Green } });
  }
  if (app.type === "mobile_app") {
    accessories.push({ icon: Icon.Mobile, tooltip: "Mobile App" });
  }
  return (
    <List.Item
      title={app.name}
      subtitle={app.description}
      icon={{ source: app.icon }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {setappInstalled && <Action.Open title={`Open ${app.name}`} target={`setapp://launch/${app.id}`} />}
            <Action.OpenInBrowser title="Open in Browser" url={app.marketing_url} />
            <Action.OpenInBrowser title="Open in Browser (Setapp Page)" url={app.sharing_url} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
