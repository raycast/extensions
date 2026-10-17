import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
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

// Raycast's built-in filtering does search `keywords`, but it ranks a keyword hit below every
// title and subtitle hit, so a gitmoji reachable only by its name (searching "art" for :art:,
// whose title is "Improve structure / format of the code.") is sorted to the very bottom of the
// results and reads as unmatched. Filtering here keeps the name a first-class search term.
const isSubsequenceOf = (token: string, text: string): boolean => {
  let index = 0;
  for (const character of text) {
    if (character === token[index]) index += 1;
    if (index === token.length) return true;
  }
  return false;
};

// Name and code are both matched because they spell a gitmoji differently: names are hyphenated
// (`white-check-mark`) while codes are not (`:white_check_mark:`), so each one finds queries the
// other misses. Dropping either breaks searching 30 of the 74 gitmojis by one of their spellings.
const scoreGitmoji = (gitmoji: Gitmoji, token: string): number => {
  const name = gitmoji.name.toLowerCase();
  const code = gitmoji.code.replace(/:/g, "").toLowerCase();
  const description = gitmoji.description.toLowerCase();

  if (name === token || code === token) return 4;
  if (name.startsWith(token) || code.startsWith(token)) return 3;
  if (name.includes(token) || code.includes(token)) return 2;
  if (description.includes(token)) return 1;
  if (isSubsequenceOf(token, `${name} ${description}`)) return 0;
  return -1;
};

const filterGitmojis = (gitmojis: Gitmoji[], searchText: string): Gitmoji[] => {
  const tokens = searchText
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/:/g, ""))
    .filter(Boolean);
  if (tokens.length === 0) return gitmojis;

  return gitmojis
    .map((gitmoji, index) => {
      let score = 0;
      for (const token of tokens) {
        const tokenScore = scoreGitmoji(gitmoji, token);
        if (tokenScore < 0) return null;
        score += tokenScore;
      }
      return { gitmoji, score, index };
    })
    .filter((match) => match !== null)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ gitmoji }) => gitmoji);
};

const GitmojiList = () => {
  const { copy, action } = getPreferenceValues<PreferenceValues>();
  const { isLoading, data, error } = useFetch<{ gitmojis: Gitmoji[] }>("https://gitmoji.dev/api/gitmojis");
  const gitmojis = data?.gitmojis.length ? data.gitmojis : [...defaultGitmojis];
  const [searchText, setSearchText] = useState("");

  const {
    data: sortedGitmojis,
    visitItem,
    resetRanking,
  } = useFrecencySorting<Gitmoji>(gitmojis, {
    key: ({ code }) => code,
  });

  const filteredGitmojis = useMemo(() => filterGitmojis(sortedGitmojis, searchText), [sortedGitmojis, searchText]);

  if (error) {
    showToast({
      title: "Failed to fetch latest gitmojis",
      message: "Using saved gitmojis as fallback",
      style: Style.Failure,
    });
  }

  return (
    <List
      searchBarPlaceholder="Search your gitmoji..."
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      <List.EmptyView title="No Gitmoji Found" description="Try searching for a gitmoji name, code or description." />
      {filteredGitmojis.map((gitmoji) => {
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
