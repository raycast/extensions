import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch, useFrecencySorting } from "@raycast/utils";
import { gitmojis as defaultGitmojis } from "gitmojis";
import Style = Toast.Style;

interface PreferenceValues {
  copy: "emoji" | "code" | "description-emoji" | "description-code";
  action: "paste" | "copy";
}

type Gitmoji = {
  emoji: string;
  entity: string;
  code: string;
  description: string;
  name: string;
};

const GitmojiList = () => {
  const { copy, action } = getPreferenceValues<PreferenceValues>();
  const { isLoading, data, error } = useFetch<{ gitmojis: Gitmoji[] }>("https://gitmoji.dev/api/gitmojis");
  const gitmojis = data?.gitmojis.length ? data.gitmojis : [...defaultGitmojis];

  const {
    data: sortedGitmojis,
    visitItem,
    resetRanking,
  } = useFrecencySorting<Gitmoji>(gitmojis, {
    key: ({ code }) => code,
  });

  if (error) {
    showToast({
      title: "Failed to fetch latest gitmojis",
      message: "Using saved gitmojis as fallback",
      style: Style.Failure,
    });
  }

  return (
    <List searchBarPlaceholder="Search your gitmoji..." isLoading={isLoading}>
      {sortedGitmojis.map((gitmoji) => {
        const { name, description, emoji, code } = gitmoji;
        let content;
        switch (copy) {
          case "code":
            content = code;
            break;
          case "description-emoji":
            content = `${emoji} ${description}`;
            break;
          case "description-code":
            content = `${code} ${description}`;
            break;
          case "emoji":
          default:
            content = emoji;
            break;
        }

        return (
          <List.Item
            id={name}
            key={name}
            title={description}
            icon={emoji}
            accessories={[{ tag: { value: code, color: Color.Yellow } }]}
            keywords={[code.replace(":", ""), name]}
            actions={
              <ActionPanel>
                {action === "copy" ? (
                  <Action.CopyToClipboard onCopy={() => visitItem(gitmoji)} content={content} />
                ) : (
                  <Action.Paste onPaste={() => visitItem(gitmoji)} content={content} />
                )}

                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    content={emoji}
                    title="Copy Emoji"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    onCopy={() => visitItem(gitmoji)}
                  />
                  <Action.CopyToClipboard
                    content={code}
                    title="Copy Code"
                    shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    onCopy={() => visitItem(gitmoji)}
                  />
                  <Action.CopyToClipboard
                    content={`${emoji} ${description}`}
                    title="Copy Emoji + Description"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "c" }}
                    onCopy={() => visitItem(gitmoji)}
                  />
                  <Action.CopyToClipboard
                    content={`${code} ${description}`}
                    title="Copy Code + Description"
                    shortcut={{ modifiers: ["ctrl", "opt"], key: "c" }}
                    onCopy={() => visitItem(gitmoji)}
                  />
                  <Action
                    title="Reset Ranking"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => resetRanking(gitmoji)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section>
                  <Action.Paste
                    content={emoji}
                    title="Paste Emoji"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                  />
                  <Action.Paste content={code} title="Paste Code" shortcut={{ modifiers: ["cmd", "opt"], key: "p" }} />
                  <Action.Paste
                    content={`${emoji} ${description}`}
                    title="Paste Emoji + Description"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "p" }}
                  />
                  <Action.Paste
                    content={`${code} ${description}`}
                    title="Paste Code + Description"
                    shortcut={{ modifiers: ["ctrl", "opt"], key: "p" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
};

export default GitmojiList;
