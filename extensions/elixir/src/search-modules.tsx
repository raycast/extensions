import React from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ModuleDetail } from "./screens/ModuleDetail";
import { MODULES } from "./utils";

export default function Command() {
  return (
    <List searchBarPlaceholder="Search module">
      {MODULES.map((module) => (
        <List.Item
          key={module.name}
          title={module.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show"
                icon={Icon.MagnifyingGlass}
                target={<ModuleDetail module={module} />}
              />
              <Action.OpenInBrowser
                url={`https://hexdocs.pm/elixir/${module.name}.html`}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
