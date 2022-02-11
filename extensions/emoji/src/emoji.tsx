import {
  ActionPanel,
  CopyToClipboardAction,
  PasteAction,
  List,
  getLocalStorageItem,
  setLocalStorageItem,
  closeMainWindow,
  popToRoot,
  preferences,
} from "@raycast/api";

import { useState, useEffect, useCallback } from "react";
import type { ReactElement, SetStateAction, Dispatch } from "react";
import { createEmojiList } from "generate-emoji-list";
import { UnicodeVersion } from "generate-emoji-list/dist/createEmojiList";

type Category = { category: string; emojis: Emoji[] };
type Emoji = {
  emoji: string;
  description: string;
  shortCode?: string[];
};

function useStateFromLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
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

  return [state, setStateAndLocalStorage, loading];
}

export default function Main(): ReactElement {
  const [list, setList] = useStateFromLocalStorage<Category[]>("emoji-list", []);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    const options = {
      unicodeVersion: preferences.unicodeVersion.value as UnicodeVersion,
      features: { shortCodes: Boolean(preferences.shortCodes.value) },
    };

    createEmojiList(options).then((list: Category[]) => {
      if (!didUnmount) {
        setList(list);
      }
    });

    return () => {
      didUnmount = true;
    };
  }, []);

  const [recentlyUsed, setRecentlyUsed, loadingRecentlyUsed] = useStateFromLocalStorage<Emoji[]>("recently-used", []);
  const addToRecentlyUsed = useCallback(
    (emoji: Emoji) => {
      setRecentlyUsed((list) =>
        list.find((x) => x.description === emoji.description) ? list : [emoji, ...list].slice(0, 10)
      );
    },
    [setRecentlyUsed]
  );

  const isLoading = list.length === 0 || loadingRecentlyUsed;

  return (
    <List isLoading={isLoading}>
      {!isLoading
        ? [{ category: "Recently Used", emojis: recentlyUsed }, ...list].map((category: Category) => (
            <List.Section title={category.category} key={category.category}>
              {category.emojis.map((emoji) => (
                <List.Item
                  key={`${category.category}${emoji.description}`}
                  id={`${category.category}${emoji.description}`}
                  icon={emoji.emoji}
                  title={emoji.description.replace(/\b(\w)/g, (s) => s.toUpperCase())}
                  accessoryTitle={emoji?.shortCode?.join(" / ")}
                  keywords={emoji.shortCode}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <PasteAction
                          title="Paste Emoji in Active App"
                          content={emoji.emoji}
                          onPaste={() => {
                            closeMainWindow();
                            popToRoot();
                            addToRecentlyUsed(emoji);
                          }}
                        />
                        <CopyToClipboardAction
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
