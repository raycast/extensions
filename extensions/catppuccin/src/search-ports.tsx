import { ActionPanel, Action, List } from "@raycast/api";
import { SearchList } from "./components/SearchList";
import { getDefaultIcon, getIcon } from "./utils/icons.util";
import type { Port } from "./types";

export default function SearchPorts() {
  const renderItem = (identifier: string, port: Port) => {
    const githubLink = `https://github.com/catppuccin/${port.alias || identifier}`;
    const platform = Array.isArray(port.platform) ? port.platform.join(", ") : port.platform || "Unknown Platform";

    return (
      <List.Item
        key={identifier}
        title={port.name}
        subtitle={`Platforms: ${platform}`}
        accessories={port.categories.map((category) => ({ tag: category }))}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} title="Open GitHub" />
          </ActionPanel>
        }
        icon={{
          value: port.icon ? getIcon(port.icon, port.color) : getDefaultIcon(port.color),
          tooltip: identifier,
        }}
      />
    );
  };

  return <SearchList<Port> dataKey="ports" searchBarPlaceholder="Search ports..." renderItem={renderItem} />;
}
