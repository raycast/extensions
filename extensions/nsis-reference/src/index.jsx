import { ActionPanel, Detail, Icon, List, PushAction } from "@raycast/api";
import { Callbacks, Commands, Includes, Plugins, Variables } from "@nsis/docs";
import slugify from "@sindresorhus/slugify";

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

function editLink(name, category) {
  const linkCategory = ["FileFunc", "LogicLib", "Memento", "StrFunc", "TextFunc", "WinVer", "WordFunc", "x64"].includes(
    category
  )
    ? `Includes/${category}`
    : category;

  const linkName = name.replace(/^\$/, "").replace(/^{/, "").replace(/}$/, "");

  return `\n\n---\n\n[Edit on GitHub](https://github.com/NSIS-Dev/Documentation/edit/master/docs/${linkCategory}/${linkName}.md)`;
}

function mapTintColor(category) {
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

export default function Command() {
  return (
    <List>
      {Object.entries(reference).map(([category, item]) =>
        Object.entries(item).map(([key, value]) => (
          <List.Item
            key={slugify(`${category}-${key}`)}
            icon={{ source: Icon.MagnifyingGlass, tintColor: mapTintColor(category) }}
            title={value.name}
            actions={
              <ActionPanel>
                <PushAction
                  title={`Show Documentation`}
                  target={<Detail markdown={`${value.content}${editLink(value.name, category)}`} />}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
