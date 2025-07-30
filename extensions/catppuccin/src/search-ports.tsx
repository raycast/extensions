/* eslint-disable @typescript-eslint/no-explicit-any */
import { ActionPanel, Action, List } from "@raycast/api";

import { getDefaultIcon, getIcon, isInvalidIcon } from "./utils/icons.util";
import { SearchList } from "./components/SearchList";
import type { Port } from "./types";

export default function SearchPorts() {
  const renderItem = (key: string, port: Port) => {
    const identifier = port.identifier || key;
    const githubLink = port.repository?.url || `https://github.com/catppuccin/${identifier}`;
    const platform = Array.isArray(port.platform) ? port.platform.join(", ") : port.platform || "Unknown";

    return (
      <List.Item
        key={identifier}
        title={port.name || key}
        subtitle={platform}
        accessories={[
          ...port.categories.map((category) => {
            if (typeof category === "string") {
              return { tag: category };
            } else if (category && typeof category === "object") {
              const categoryName =
                (category as any).name || (category as any).key || (category as any).title || "Unknown";
              return { tag: categoryName };
            }
            return { tag: "Unknown" };
          }),
          ...(port["is-archived"] ? [{ tag: { value: "Archived", color: "#f38ba8" } }] : []),
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={githubLink} />
            {port.links?.map((link, index) => (
              <Action.OpenInBrowser key={index} url={link.url} title={`Open ${link.name}`} />
            ))}
          </ActionPanel>
        }
        icon={port.icon && !isInvalidIcon(port.icon) ? getIcon(port.icon, port.color) : getDefaultIcon(port.color)}
      />
    );
  };

  return <SearchList<Port> dataKey="ports" searchBarPlaceholder="Search ports..." renderItem={renderItem} />;
}
