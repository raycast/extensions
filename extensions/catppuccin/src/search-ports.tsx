import { ActionPanel, Action, List } from "@raycast/api";
import { SearchList } from "./components/SearchList";

interface PortDetails {
  name: string;
  platform?: string | string[];
  categories?: string[];
  icon?: string;
  color?: string;
}

export default function SearchPorts() {
  const renderItem = (portName: string, portDetails: PortDetails) => {
    const githubLink = `https://github.com/catppuccin/${portName}`;
    const platform = Array.isArray(portDetails.platform)
      ? portDetails.platform.join(", ")
      : portDetails.platform || "Unknown Platform";

    return (
      <List.Item
        key={portName}
        title={portDetails.name}
        subtitle={`Platforms: ${platform}`}
        accessories={portDetails.categories ? portDetails.categories.map((category) => ({ tag: category })) : undefined}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
          </ActionPanel>
        }
      />
    );
  };

  const filterFunction = (name: string, portDetails: PortDetails, searchText: string) => {
    const lowerSearchText = searchText.toLowerCase();
    return name.toLowerCase().includes(lowerSearchText) || portDetails.name.toLowerCase().includes(lowerSearchText);
  };

  return (
    <SearchList<PortDetails>
      dataKey="ports"
      searchBarPlaceholder="Search ports..."
      renderItem={renderItem}
      filterFunction={filterFunction}
    />
  );
}
