import { ActionPanel, Detail, Icon, List, Action } from "@raycast/api";
// @ts-expect-error Cannot find module '@nsis/docs' or its corresponding type declarations.ts (2307)
import { Callbacks, Commands, Includes, Plugins, Variables } from "@nsis/docs";
import slugify from "@sindresorhus/slugify";
import { useState } from "react";

const reference = {
  Commands,
  Variables,
  Callbacks,
  FileFunc: Includes.FileFunc,
  LogicLib: Includes.LogicLib,
  Memento: Includes.Memento,
  StrFunc: Includes.StrFunc,
  TextFunc: Includes.TextFunc,
  WinVer: Includes.WinVer,
  WordFunc: Includes.WordFunc,
  x64: Includes.x64,
  Plugins,
};

function editLink(name: string, category: string) {
  const linkCategory = ["FileFunc", "LogicLib", "Memento", "StrFunc", "TextFunc", "WinVer", "WordFunc", "x64"].includes(
    category,
  )
    ? `Includes/${category}`
    : category;

  const linkName = name.replace(/^\$/, "").replace(/^{/, "").replace(/}$/, "");

  return `\n\n---\n\n[Edit on GitHub](https://github.com/NSIS-Dev/Documentation/edit/main/docs/${linkCategory}/${linkName}.md)`;
}

function mapTintColor(category: string) {
  switch (category) {
    case "Commands":
      return "#4caf50";

    case "Variables":
      return "#ff5722";

    case "Callbacks":
      return "#2196f3";

    case "FileFunc":
    case "LogicLib":
    case "Memento":
    case "StrFunc":
    case "TextFunc":
    case "WinVer":
    case "WordFunc":
    case "x64":
      return "#ff9800";

    case "Plugins":
      return "#673ab7";

    default:
      return "#9e9e9e";
  }
}

type Value = {
  name: string;
  content: string;
};
type Item = {
  [key: string]: Value;
};

export default function Command() {
  const [category, setCategory] = useState("");
  const filtered = !category
    ? reference
    : Object.fromEntries(Object.entries(reference).filter(([key]) => key === category));

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Category" onChange={setCategory}>
          <List.Dropdown.Item icon={Icon.MagnifyingGlass} title="All" value="" />
          <List.Dropdown.Section title="Categories">
            {Object.keys(reference).map((category) => (
              <List.Dropdown.Item
                key={category}
                icon={{ source: Icon.MagnifyingGlass, tintColor: mapTintColor(category) }}
                title={category}
                value={category}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {Object.entries(filtered).map(([category, item]) =>
        Object.entries(item as Item).map(([key, value]) => (
          <List.Item
            key={slugify(`${category}-${key}`)}
            icon={{ source: Icon.MagnifyingGlass, tintColor: mapTintColor(category) }}
            title={value.name}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Documentation"
                  target={<Detail markdown={`${value.content}${editLink(value.name, category)}`} />}
                />
              </ActionPanel>
            }
          />
        )),
      )}
    </List>
  );
}
