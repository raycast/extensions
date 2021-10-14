import {
  ActionPanel,
  CopyToClipboardAction,
  PasteAction,
  List,
  getLocalStorageItem,
  setLocalStorageItem,
} from "@raycast/api";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ReactElement, SetStateAction, Dispatch } from "react";
import { createEmojiList } from "generate-emoji-list";

type Category = { category: string; emojis: Emoji[] };
type Emoji = {
  emoji: string;
  description: string;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useStateFromLocalStorage = <T, _ = void>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] => {
  const [state, setState] = useState<T>(initialValue);
  const didUnmount = useRef<boolean>(false);

  useEffect(() => {
    (async () => {
      const cache = await getLocalStorageItem(key);

      if (typeof cache === "string") {
        if (!didUnmount.current) {
          setState(JSON.parse(cache));
        }
      }
    })();

    return () => {
      didUnmount.current = true;
    };
  }, []);

  const setStateAndLocalStorage = useCallback((updater) => {
    setState((state) => {
      const newValue = typeof updater === "function" ? updater(state) : updater;
      setLocalStorageItem(key, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  return [state, setStateAndLocalStorage];
};

export default function Main(): ReactElement {
  const [list, setList] = useStateFromLocalStorage<Category[]>("emoji-list", []);
  const didUnmount = useRef<boolean>(false);

  useEffect(() => {
    createEmojiList().then((list: Category[]) => {
      if (!didUnmount.current) {
        setList(list);
      }
    });

    return () => {
      didUnmount.current = true;
    };
  }, []);

  const [recentlyUsed, setRecentlyUsed] = useStateFromLocalStorage<Emoji[]>("recently-used", []);
  const addToRecentlyUsed = useCallback((emoji: Emoji) => {
    setRecentlyUsed((list) =>
      list.find((x) => x.description === emoji.description) ? list : [emoji, ...list].slice(0, 10)
    );
  }, []);

  return (
    <List isLoading={list.length === 0}>
      {[{ category: "Recently Used", emojis: recentlyUsed }, ...list].map((category: Category) => (
        <List.Section title={category.category} key={category.category}>
          {category.emojis.map((emoji) => (
            <List.Item
              key={`${category.category}${emoji.description}`}
              id={`${category.category}${emoji.description}`}
              icon={emoji.emoji}
              title={emoji.description}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <PasteAction
                      title="Paste Emoji to Curent Window"
                      content={emoji.emoji}
                      onPaste={() => addToRecentlyUsed(emoji)}
                    />
                    <CopyToClipboardAction
                      title="Copy Emoji to Clipboard"
                      content={emoji.emoji}
                      onCopy={() => addToRecentlyUsed(emoji)}
                    />
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
