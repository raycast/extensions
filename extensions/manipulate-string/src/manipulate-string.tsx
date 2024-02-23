import { Clipboard, Detail } from "@raycast/api";
import { List, ActionPanel, Action } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { manipulateString } from "./manipulations";

export default function Command() {
  const { isLoading, data } = usePromise(Clipboard.readText, [], {});

  if (data === undefined) {
    return <List isLoading={isLoading} />;
  }

  return (
    <List isLoading={isLoading}>
      {manipulateString(data).map(({ key, value }) => {
        return (
          <List.Item
            key={key}
            title={key}
            subtitle={formatForSubtile(value)}
            actions={
              <ActionPanel>
                <Action.Push
                  title={key}
                  target={
                    <Detail
                      markdown={formatMarkdown(value)}
                      actions={
                        <ActionPanel>
                          <Action.CopyToClipboard content={value} />
                          <Action.Paste shortcut={{ modifiers: ["cmd"], key: "enter" }} content={value} />
                        </ActionPanel>
                      }
                    />
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function formatForSubtile(value: string): string {
  return value.replaceAll(/\n+/g, " ");
}

function formatMarkdown(value: string): string {
  return [
    "    ",
    value
      .split("\n")
      .map((s) => "    " + s)
      .join("\n"),
    "    ",
  ].join("\n");
}
