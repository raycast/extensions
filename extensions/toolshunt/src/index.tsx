import { List, Action, ActionPanel, Icon, open, showHUD } from "@raycast/api";
import { useState } from "react";
import { tools, Tool } from "./tools-config";
import React from "react";

export default function Command() {
  const [searchText, setSearchText] = useState("");

  const toRaycastIcon = (icon: string) => {
    if (
      icon.includes("/") ||
      icon.endsWith(".png") ||
      icon.endsWith(".jpg") ||
      icon.endsWith(".jpeg") ||
      icon.endsWith(".svg")
    ) {
      return icon;
    }
    return { source: icon } as const;
  };

  const openTool = async (toolId: string) => {
    try {
      await open(`toolshunt://tool/${toolId}`);
    } catch (error) {
      await showHUD(`❌ Failed to open ${toolId}`);
    }
  };

  const filteredTools = tools.filter((tool) => {
    const searchLower = searchText.toLowerCase();
    return (
      tool.name.toLowerCase().includes(searchLower) ||
      tool.nameZh.includes(searchText) ||
      tool.description.toLowerCase().includes(searchLower) ||
      tool.descriptionZh.includes(searchText) ||
      tool.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(searchLower),
      )
    );
  });

  return (
    <List
      searchBarPlaceholder="Search ToolsHunt tools..."
      onSearchTextChange={setSearchText}
      throttle
    >
      {filteredTools.map((tool) => (
        <List.Item
          key={tool.id}
          icon={toRaycastIcon(tool.icon)}
          title={tool.name}
          subtitle={tool.nameZh}
          accessories={[{ text: tool.description }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Tool"
                icon={Icon.AppWindow}
                onAction={() => openTool(tool.id)}
              />
              <Action.CopyToClipboard
                title="Copy Tool Name"
                content={tool.name}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
