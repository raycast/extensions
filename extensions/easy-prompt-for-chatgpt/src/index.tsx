import { ActionPanel, Detail, List, Action, getPreferenceValues, LocalStorage } from "@raycast/api";
import { parse } from "csv-parse";
import { useEffect, useState } from "react";
import axios from "axios";

interface Preferences {
  primaryAction: "copy" | "paste";
  lang: string;
  customSources: string;
  refetchTimeout: string;
}

interface Item {
  act: string;
  prompt: string;
  type?: string;
  description?: string;
  subtitle?: string;
}

interface SystemURLs {
  [key: string]: string;
}

interface UrlItem {
  url: string;
  type: "system" | "custom";
}

// default system list urls
const systemUrls: SystemURLs = {
  en: "https://raw.githubusercontent.com/f/awesome-chatgpt-prompts/main/prompts.csv",
  "zh-cn":
    "https://raw.githubusercontent.com/PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh.json",
  "zh-tw":
    "https://raw.githubusercontent.com/PlexPt/awesome-chatgpt-prompts-zh/main/prompts-zh-TW.json",
};

async function fetch(item: UrlItem): Promise<{ type: string; items: Item[] }> {
  const res = { type: item.type, items: [] };
  try {
    const { data } = await axios.get(item.url);
    if (isValidFiletype(item.url, "csv")) {
      return new Promise((resolve) => {
        parse(data, { columns: true }, (err, records) => {
          if (!err) res.items = records;
          resolve(res);
        });
      });
    }
    res.items = data;
  } catch (error) {
    console.log(error);
  }

  return res;
}

// only support csv or json
function isValidUrl(url: string) {
  const urlRegex = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/;
  if (!urlRegex.test(url)) {
    return false;
  }

  return isValidFiletype(url, "json") || isValidFiletype(url, "csv");
}

function isValidFiletype(url: string, extension: string) {
  const fileRegex = new RegExp(`\\.${extension}$`, "i");
  return fileRegex.test(url);
}

export default function Command() {
  const { lang, primaryAction, customSources, refetchTimeout } = getPreferenceValues<Preferences>();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const urls: UrlItem[] = [];
  const timeout = parseInt(refetchTimeout) || 360;

  if (customSources) {
    customSources.split(",").forEach((url: string) => {
      if (isValidUrl(url)) {
        urls.push({ url, type: "custom" });
      }
    });
  }

  urls.push({ url: systemUrls[lang], type: "system" });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const cachedString = await LocalStorage.getItem<string>("cached");
      const cached = cachedString ? JSON.parse(cachedString) : {};

      if (
        cached.timestamp &&
        cached.items &&
        cached.lang === lang &&
        cached.customSources === customSources &&
        Date.now() - cached.timestamp < 1000 * 60 * timeout
      ) {
        setItems(cached.items);
        setLoading(false);
        return;
      }

      try {
        const results = await Promise.all(urls.map(fetch));
        const items: Item[] = [];
        results.forEach((result) => {
          result.items.forEach((item) => {
            item.subtitle = result.type;
          });
          items.push(...result.items);
        });
        Object.assign(cached, {
          timestamp: Date.now(),
          items,
          lang,
          customSources,
        });
        await LocalStorage.setItem("cached", JSON.stringify(cached));
        setItems(items);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <List isLoading={loading}>
      {items.map((item, index) => (
        <List.Item
          key={index}
          title={item.act}
          subtitle={item.subtitle}
          icon="list-icon.png"
          actions={
            <ActionPanel>
              {primaryAction === "copy" ? (
                <>
                  <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                  <Action.Paste title="Paste Prompt in Active App" content={item.prompt} />
                </>
              ) : (
                <>
                  <Action.Paste title="Paste Prompt in Active App" content={item.prompt} />
                  <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                </>
              )}
              <Action.Push
                title="Show Prompt"
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                target={
                  <Detail
                    markdown={`${item.prompt}${
                      item.description ? "\r\n\r\n" + item.description : ""
                    }`}
                    actions={
                      <ActionPanel>
                        {primaryAction === "copy" ? (
                          <>
                            <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
                            <Action.Paste
                              title="Paste Prompt in Active App"
                              content={item.prompt}
                            />
                          </>
                        ) : (
                          <>
                            <Action.Paste
                              title="Paste Prompt in Active App"
                              content={item.prompt}
                            />
                            <Action.CopyToClipboard title="Copy Prompt" content={item.prompt} />
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
      ))}
    </List>
  );
}
