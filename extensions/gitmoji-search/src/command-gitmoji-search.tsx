import {
  ActionPanel,
  CopyToClipboardAction,
  getLocalStorageItem,
  List,
  PasteAction,
  setLocalStorageItem,
  showToast,
  ToastStyle
} from "@raycast/api";
import fetch from "node-fetch";
import {useEffect, useState} from "react";

// noinspection JSUnusedGlobalSymbols
export default function CommandGitmojiSearch() {
  const [isLoading, setIsLoading] = useState(true);
  const [gitmojis, setGitmojis] = useState<Gitmoji[]>([]);

  useEffect(() => {
    readFromCache()
      .then(cache => {
        if (cache.cached) setGitmojis(cache.gitmojis);
        if (Date.now() - cache.timestamp > oneDay) {
          return pullGitmojis()
            .then(setToCache)
            .then(setGitmojis);
        }

        return Promise.resolve();
      })
      .catch(e => showToast(ToastStyle.Failure, e.message))
      .finally(() => setIsLoading(false));
  }, []);

  return <List isLoading={isLoading}>
    {gitmojis.map(gitmoji => <List.Item
      key={gitmoji.code}
      icon={gitmoji.emoji}
      title={gitmoji.description}
      accessoryTitle={gitmoji.code}
      actions={<Actions gitmoji={gitmoji}/>}
    />)}
  </List>;
}

const Actions = ({gitmoji}: { gitmoji: Gitmoji }) => <ActionPanel>
  <PasteAction title="Paste emoji" content={gitmoji.emoji}/>
  <PasteAction title="Paste emoji code" content={gitmoji.code}/>
  <CopyToClipboardAction
    title="Copy emoji"
    content={gitmoji.emoji}
    shortcut={{key: "e", modifiers: ["cmd"]}}
  />
  <CopyToClipboardAction
    title="Copy emoji code"
    content={gitmoji.code}
    shortcut={{key: "e", modifiers: ["cmd", "shift"]}}
  />
</ActionPanel>;

const url = "https://raw.githubusercontent.com/carloscuesta/gitmoji/master/src/data/gitmojis.json";
const cacheKey = "gitmojis-cached";
const oneDay = 86400_000;

const pullGitmojis = () =>
  Promise.resolve()
    .then(() => console.debug("api pull gitmojis"))
    .then(() => fetch(url))
    .then(resp => resp.json())
    .then(json => json as { gitmojis: Gitmoji[] })
    .then(json => json.gitmojis);

const readFromCache = (): Promise<Cache> =>
  getLocalStorageItem(cacheKey)
    .then(serialized => {
      if (!serialized || typeof serialized !== "string") return noCache();

      const parsed = JSON.parse(serialized) as Cache;
      if (!parsed.cached) return noCache();

      parsed.cached = true;

      return parsed;
    });

const setToCache = (gitmojis: Gitmoji[]) =>
  setLocalStorageItem(cacheKey, JSON.stringify({gitmojis, timestamp: Date.now()} as Cache))
    .then(() => gitmojis);

const noCache = (): Cache => ({cached: false, gitmojis: [], timestamp: 0});

type Gitmoji = {
  emoji: string;
  entity: string;
  code: string;
  description: string;
  name: string;
};

type Cache = {
  cached: boolean;
  timestamp: number;
  gitmojis: Gitmoji[];
};
