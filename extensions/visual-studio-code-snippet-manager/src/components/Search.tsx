import { List, Action, ActionPanel, useNavigation, confirmAlert, Alert, popToRoot } from "@raycast/api";
import fs from "fs";
import { useEffect, useState } from "react";
import { path } from "../data";
import Editor from "./Editor";

type SetItem = Required<Item>;
export default function Search() {
  const [items, setItems] = useState<SetItem[] | null>(null);
  const { push } = useNavigation();
  useEffect(() => {
    if (fs.existsSync(path)) {
      const obj = JSON.parse(fs.readFileSync(path).toString()) as {
        [key: string]: {
          prefix: string;
          description: string;
          title: string;
          body: string[];
          scope: string;
        };
      };
      const items = Object.keys(obj).map((key) => {
        return { ...obj[key], body: obj[key].body.join("\n"), scope: obj[key].scope.split(","), id: key };
      });
      setItems(items);
    }
  }, []);
  const deleteSnippet = (key: string) => {
    const obj = JSON.parse(fs.readFileSync(path).toString()) as {
      [key: string]: { prefix: string; description: string; title: string; body: string[]; scope: string };
    };
    delete obj[key];
    fs.writeFileSync(path, JSON.stringify(obj));
  };

  return (
    <List isShowingDetail>
      {items?.map((v) => {
        return (
          <List.Item
            keywords={[...v.scope, v.body, v.prefix, v.description]}
            key={v.id}
            title={v.title}
            subtitle={v.description}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  onCopy={() => {
                    popToRoot();
                  }}
                  content={v.body}
                ></Action.CopyToClipboard>
                <Action.Push title={"edit snippet"} target={<Editor {...v} />}></Action.Push>
                <Action
                  title="delete snippet"
                  onAction={async () => {
                    await confirmAlert({
                      title: "delete snippet",
                      message: `${v.title} is deleted. Are you sure?`,
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
    </List>
  );
}
