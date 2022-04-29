import { Action, ActionPanel, Alert, confirmAlert, List, popToRoot, useNavigation } from "@raycast/api";
import Editor from "./Editor";
import Search from "./Search";
import fs from "fs";
import { vsCodeInsidersPath, vsCodePath } from "../data";
type Props = {
  items: Required<Item>[] | null;
  title: "vscode" | "vscode-insiders";
};
const SearchSection = ({ items, title }: Props) => {
  const { push } = useNavigation();
  const deleteSnippet = (key: string) => {
    let path = "";
    if (title === "vscode") {
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
                  title={"edit snippet"}
                  target={<Editor {...v} title={v.id} type="vscode-insiders" />}
                ></Action.Push>
                <Action
                  title="delete snippet"
                  onAction={async () => {
                    await confirmAlert({
                      title: "delete snippet",
                      message: `${v.id} is deleted. Are you sure?`,
                      primaryAction: {
                        style: Alert.ActionStyle.Destructive,
                        title: "delete",
                        onAction: () => {
                          deleteSnippet(v.id);
                          push(<Search />);
                        },
                      },
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                ></Action>
                <Action
                  title="back"
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
## prefix
\`\`\`
${v.prefix}
\`\`\`
---
## body
\`\`\`
${v.body}
\`\`\`
---
## langages
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
