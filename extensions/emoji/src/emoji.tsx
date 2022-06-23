import { ActionPanel, List, closeMainWindow, popToRoot, getPreferenceValues, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { createEmojiList } from "generate-emoji-list";
import { UnicodeVersion } from "generate-emoji-list/dist/createEmojiList";
// @ts-expect-error no types available
import emojiKeywords from "emojilib";
import Fuse from "fuse.js";
import { usePersistentState } from "raycast-toolkit";

type Category = { category: string; emojis: Emoji[] };
type Emoji = {
  emoji: string;
  description: string;
  shortCode?: string[];
  keywords?: string[];
  category?: string;
};

const filterList = (list: Category[], searchText: string, category: string): Category[] => {
  return list.map((c) => {
    const emojis = c.emojis.filter((emoji) => {
      return category !== "" ? emoji.category === category : true;
    });
    const fuse = new Fuse(emojis, { keys: ["keywords"] });
    return { ...c, emojis: searchText === "" ? emojis : fuse.search(searchText).map((item) => item.item) };
  });
};

export default function Main(): ReactElement {
  const [list, setList] = usePersistentState<Emoji[]>("emoji-list-v2", []);
  const [categories, setCategories] = usePersistentState<string[]>("emoji-categories", []);
  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    const options = {
      unicodeVersion: getPreferenceValues().unicodeVersion.value as UnicodeVersion,
      features: { shortCodes: Boolean(getPreferenceValues().shortCodes.value) },
    };

    createEmojiList(options).then((list: Category[]) => {
      if (!didUnmount) {
        setList(
          list.flatMap((category) =>
            category.emojis.map((emoji) => ({
              ...emoji,
              category: category.category,
              keywords: emojiKeywords[emoji.emoji],
            }))
          )
        );
        setCategories(list.map((category) => category.category));
      }
    });

    return () => {
      didUnmount = true;
    };
  }, []);

  const [recentlyUsed, setRecentlyUsed, loadingRecentlyUsed] = usePersistentState<Emoji[]>("recently-used", []);
  const addToRecentlyUsed = (emoji: Emoji) => {
    setRecentlyUsed((list) =>
      list.find((x) => x.description === emoji.description) ? list : [emoji, ...list].slice(0, 10)
    );
  };

  const [category, setCategory] = useState<string>("");
  const [searchText, setSearchText] = useState("");

  const isLoading = list.length === 0 || loadingRecentlyUsed;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Category" onChange={setCategory}>
          <List.Dropdown.Item key={category} title="All Emojis" value="" icon="🥳" />
          {categories.map((category) => (
            <List.Dropdown.Item
              key={category}
              title={category}
              value={category}
              icon={list.find((emoji) => emoji.category === category)?.emoji}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!isLoading
        ? filterList(
            [
              !searchText && { category: "Recently Used", emojis: recentlyUsed },
              { category: category || "Emojis", emojis: list },
            ].filter(Boolean) as Category[],
            searchText,
            category
          ).map((category: Category) => (
            <List.Section title={category.category} key={category.category}>
              {category.emojis.map((emoji) => (
                <List.Item
                  key={emoji.description}
                  id={`${category.category}${emoji.description}`}
                  icon={emoji.emoji}
                  title={emoji.description.replace(/\b(\w)/g, (s) => s.toUpperCase())}
                  accessoryTitle={emoji?.shortCode?.join(" / ")}
                  keywords={emoji.shortCode}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Paste
                          title="Paste Emoji in Active App"
                          content={emoji.emoji}
                          onPaste={() => {
                            closeMainWindow();
                            popToRoot();
                            addToRecentlyUsed(emoji);
                          }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Emoji to Clipboard"
                          content={emoji.emoji}
                          onCopy={() => {
                            closeMainWindow();
                            popToRoot();
                            addToRecentlyUsed(emoji);
                          }}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          ))
        : []}
    </List>
  );
}
