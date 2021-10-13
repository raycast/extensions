import {
  ActionPanel,
  CopyToClipboardAction,
  PasteAction,
  List,
  getLocalStorageItem,
  setLocalStorageItem,
} from "@raycast/api";

import { useState, useEffect, useRef, ReactElement } from "react";
import { createEmojiList } from "generate-emoji-list";

type Category = { category: string; emojis: Emoji[] };
type Emoji = {
  emoji: string;
  description: string;
};

export default function Main(): ReactElement {
  const [searchText, setSearchText] = useState<string>("");
  const [list, setList] = useState<Category[]>([]);
  const didUnmount = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      const cachedList = await getLocalStorageItem("emoji-list");

      if (didUnmount.current) return;

      if (typeof cachedList === "string") {
        setList(JSON.parse(cachedList));
      }

      createEmojiList().then((list: Category[]) => {
        setLocalStorageItem("emoji-list", JSON.stringify(list));
        if (!didUnmount.current) {
          setList(list);
        }
      });
    })();

    return () => {
      didUnmount.current = true;
    };
  }, []);

  return (
    <List onSearchTextChange={setSearchText} isLoading={list.length === 0}>
      {list.map((category: Category) => (
        <List.Section title={category.category} key={category.category}>
          {category.emojis
            .filter((emoji) => emoji.description.includes(searchText))
            .map((emoji) => (
              <List.Item
                key={emoji.description}
                id={emoji.description}
                icon={emoji.emoji}
                title={emoji.description}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section>
                      <PasteAction title="Paste Emoji to curent window" content={emoji.emoji} />
                      <CopyToClipboardAction title="Copy Emoji to Clipboard" content={emoji.emoji} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
