import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, List, popToRoot, useNavigation } from "@raycast/api";
import Editor from "./Editor";
import Search from "./Search";
import fs from "fs";
import { vsCodeInsidersPath, vsCodePath } from "../data";
type Props = {
  items: Required<Item>[] | null;
  title: "Visual Studio Code" | "Visual Studio Code Insiders";
};
const SearchSection = ({ items, title }: Props) => {
  const { push } = useNavigation();
  const deleteSnippet = (key: string) => {
    let path = "";
    if (title === "Visual Studio Code") {
      path = vsCodePath;
    } else {
      path = vsCodeInsidersPath;
    }
    const obj = JSON.parse(fs.readFileSync(path).toString()) as {
      [key: string]: { prefix: string; description: string; title: string; body: string[]; scope: string };
    };
    delete obj[key];
    fs.writeFileSync(path, JSON.stringify(obj));
  };
  return (
    <List.Section title={title}>
      {items?.map((v) => {
        return (
          <List.Item
            keywords={[...v.scope, v.body, v.prefix, v.description]}
            key={v.id}
            title={v.id}
            subtitle={v.description}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  onCopy={() => {
                    popToRoot();
                  }}
                  content={v.body}
                ></Action.CopyToClipboard>
                <Action.Push
                  icon={Icon.Gear}
                  title="Edit Snippet"
                  target={<Editor {...v} title={v.id} type="Visual Studio Code Insiders" />}
                ></Action.Push>
                <Action
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  title="Delete Snippet"
                  onAction={async () => {
                    await confirmAlert({
                      title: "Delete Snippet",
                      message: `Are you sure you want to delete ${v.id}?`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "Delete",
                        onAction: () => {
                          deleteSnippet(v.id);
                          push(<Search />);
                        },
                      },
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                ></Action>

                <Action.Push icon={Icon.Pencil} title="Create Snippet" target={<Editor />}></Action.Push>
                <Action
                  icon={Icon.ArrowClockwise}
                  title="Back"
                  onAction={() => {
                    popToRoot();
                  }}
                  shortcut={{ modifiers: [], key: "escape" }}
                ></Action>
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                markdown={`
## Prefix
\`\`\`
${v.prefix}
\`\`\`
---
## Body
\`\`\`
${v.body}
\`\`\`
---
## Languages
${v.scope}

`}
              ></List.Item.Detail>
            }
          ></List.Item>
        );
      })}
    </List.Section>
  );
};

export default SearchSection;
