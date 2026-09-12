import type { ModuleDoc } from "./types";
import React, { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ModuleDetail } from "./screens/ModuleDetail";
import { MODULES } from "./utils";

export default function Command() {
  const [modules, setModules] = useState<ModuleDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadModules() {
      const loadedModules = await Promise.all(MODULES);
      setModules(loadedModules);
      setIsLoading(false);
    }

    loadModules();
  }, []);

  return (
    <List searchBarPlaceholder="Search module" isLoading={isLoading}>
      {modules.map((module) => (
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
