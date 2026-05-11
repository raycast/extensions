import { ActionPanel, List, getPreferenceValues, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import type { ReactElement } from "react";
import { createEmojiList, UnicodeVersion } from "./vendor/generate-emoji-list/createEmojiList";
import emojiKeywords from "emojilib";
import Fuse from "fuse.js";
import { usePersistentState } from "raycast-toolkit";

const { primaryAction, unicodeVersion, shortCodes } = getPreferenceValues<{
  primaryAction: "paste" | "copy";
  unicodeVersion: UnicodeVersion;
  shortCodes: boolean;
}>();
const allEmojis = "All Emojis";

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

const getEmojipediaLink = (description: string) =>
  `https://emojipedia.org/${description.toLowerCase().replace(/:? /g, "-")}/`;

export default function Main(): ReactElement {
  const [list, setList] = usePersistentState<Emoji[]>("emoji-list-v2", []);
  const [categories, setCategories] = usePersistentState<string[]>("emoji-categories", []);
  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    createEmojiList({
      unicodeVersion,
      features: { shortCodes },
    }).then((list: Category[]) => {
      if (!didUnmount) {
        setList(
          list.flatMap((category) =>
            category.emojis.map((emoji) => ({
              ...emoji,
              category: category.category,
              keywords: emojiKeywords[emoji.emoji],
            })),
          ),
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
      list.find((x) => x.description === emoji.description) ? list : [emoji, ...list].slice(0, 10),
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
          <List.Dropdown.Item key={category} title={allEmojis} value="" icon="🥳" />
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
              { category: category || allEmojis, emojis: list },
            ].filter(Boolean) as Category[],
            searchText,
            category,
          ).map((category: Category) => (
            <List.Section title={category.category} key={category.category}>
              {category.emojis.map((emoji) => {
                const paste = (
                  <Action.Paste
                    content={emoji.emoji}
                    onPaste={() => {
                      addToRecentlyUsed(emoji);
                    }}
                  />
                );
                const copy = (
                  <Action.CopyToClipboard
                    content={emoji.emoji}
                    onCopy={() => {
                      addToRecentlyUsed(emoji);
                    }}
                  />
                );
                return (
                  <List.Item
                    key={emoji.description}
                    id={`${category.category}${emoji.description}`}
                    icon={emoji.emoji}
                    title={emoji.description.replace(/\b(\w)/g, (s) => s.toUpperCase())}
                    keywords={emoji.shortCode}
                    actions={
                      <ActionPanel>
                        <ActionPanel.Section>
                          {primaryAction === "paste" ? (
                            <>
                              {paste}
                              {copy}
                            </>
                          ) : (
                            <>
                              {copy}
                              {paste}
                            </>
                          )}
                          {shortCodes && emoji.shortCode && (
                            <Action.CopyToClipboard
                              title="Copy Shortcode"
                              content={emoji.shortCode[0]}
                              onCopy={() => {
                                addToRecentlyUsed(emoji);
                              }}
                            />
                          )}
                          <Action.OpenInBrowser title="View on Emojipedia" url={getEmojipediaLink(emoji.description)} />
                        </ActionPanel.Section>
                      </ActionPanel>
                    }
                    accessories={[
                      {
                        text: emoji?.shortCode?.join(" / "),
                      },
                    ]}
                  />
                );
              })}
            </List.Section>
          ))
        : []}
    </List>
  );
}
