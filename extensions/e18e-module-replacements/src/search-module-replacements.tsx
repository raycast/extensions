import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ModuleReplacement, all } from "module-replacements";
import { useState } from "react";

import { DetailView } from "./components/DetailView";
import { Mappings, ModuleReplacementResolved, TYPE_COLOR, TYPE_LABEL } from "./constants";

const modules = Object.keys(all.mappings)
  .toSorted((a, b) => a.localeCompare(b))
  .map((name) => Mappings.get(name))
  .filter((module): module is ModuleReplacementResolved => !!module);

function groupByFirstLetter(modules: ModuleReplacementResolved[]) {
  const map = new Map<string, ModuleReplacementResolved[]>();
  for (const module of modules) {
    const firstLetter = module.moduleName[0].toUpperCase();
    if (!map.has(firstLetter)) map.set(firstLetter, []);
    map.get(firstLetter)!.push(module);
  }
  return Array.from(map.entries());
}

export default function Command() {
  const [type, setType] = useState<ModuleReplacement["type"] | "all">("all");

  const filteredModules =
    type === "all"
      ? modules
      : modules.filter((module) => module.replacements.some((replacement) => replacement.type === type));
  const filteredSections = groupByFirstLetter(filteredModules);

  return (
    <List
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Replacement Type"
          onChange={(newValue) => setType(newValue as ModuleReplacement["type"] | "all")}
        >
          <List.Dropdown.Item title="All" value="all" />

          {Object.entries(TYPE_LABEL).map(([type, label]) => (
            <List.Dropdown.Item key={type} title={label} value={type} />
          ))}
        </List.Dropdown>
      }
    >
      {filteredSections.map(([firstLetter, modules]) => (
        <List.Section title={firstLetter} key={firstLetter}>
          {modules.map((module) => {
            return (
              <List.Item
                key={module.moduleName}
                title={module.moduleName}
                keywords={module.replacements.map((replacement) => replacement.id)}
                accessories={module.replacements.map((replacement) => ({
                  tag: {
                    value: replacement.id,
                    color: TYPE_COLOR[replacement.type],
                  },
                  tooltip: TYPE_LABEL[replacement.type],
                }))}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Full Details"
                      icon={Icon.Sidebar}
                      target={<DetailView moduleName={module.moduleName} />}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
