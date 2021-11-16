import {
  ActionPanel,
  CopyToClipboardAction,
  PasteAction,
  List,
  getLocalStorageItem,
  setLocalStorageItem,
} from "@raycast/api";

import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    (async () => {
      const cache = await getLocalStorageItem(key);

      if (typeof cache === "string") {
        if (!didUnmount) {
          setState(JSON.parse(cache));
        }
      }
    })();

    return () => {
      didUnmount = true;
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

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    createEmojiList().then((list: Category[]) => {
      if (!didUnmount) {
        setList(list);
      }
    });

    return () => {
      didUnmount = true;
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
                      title="Paste Emoji to Current Window"
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
