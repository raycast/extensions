import { ActionPanel, Detail, List, Action, getPreferenceValues } from "@raycast/api";
import data from "./result.json";

type CommandPreferences = {
  primaryAction: "copy" | "paste";
};

export default function Command() {
  const preferences: CommandPreferences = getPreferenceValues();

  return (
    <List>
      {data.map((item, index) => {
        const content = item.items
          .map((item) => {
            return `${item.content}`;
          })
          .join("\n");

        return (
          <List.Item
            key={item.title + index}
            icon="list-icon.png"
            title={item.title}
            actions={
              <ActionPanel>
                {preferences.primaryAction === "copy" ? (
                  <>
                    <Action.CopyToClipboard title="Copy Prompt" content={content} />
                    <Action.Paste title="Paste Prompt in Active App" content={content} />
                  </>
                ) : (
                  <>
                    <Action.Paste title="Paste Prompt in Active App" content={content} />
                    <Action.CopyToClipboard title="Copy Prompt" content={content} />
                  </>
                )}
                <Action.Push
                  title="Show Prompt"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={
                    <Detail
                      markdown={content}
                      actions={
                        <ActionPanel>
                          {preferences.primaryAction === "copy" ? (
                            <>
                              <Action.CopyToClipboard title="Copy Prompt" content={content} />
                              <Action.Paste title="Paste Prompt in Active App" content={content} />
                            </>
                          ) : (
                            <>
                              <Action.Paste title="Paste Prompt in Active App" content={content} />
                              <Action.CopyToClipboard title="Copy Prompt" content={content} />
                            </>
                          )}
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
