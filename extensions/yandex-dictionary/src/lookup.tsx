import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  openExtensionPreferences,
  List,
  Icon,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { addToHistory } from "./storage";
import { lookupWord } from "./api";
import type { YaDictionaryArgs, Preferences, YandexDefinition, YandexLookupResponse } from "./types";

type LookupViewProps = {
  query?: string;
  from: string;
  to: string;
};

export function LookupView(props: LookupViewProps) {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;
  if (!apiKey) {
    showToast(Toast.Style.Failure, "API Key is required", "Set it in the extension preferences");
    openExtensionPreferences();
    throw new Error("API Key is missing");
  }

  const initialQuery = props.query ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<YandexDefinition[] | null>(null);

  const handleErrorCode = (code: number | undefined, httpStatus?: number) => {
    switch (code) {
      case 200:
        return;
      case 401:
        showToast(Toast.Style.Failure, "Invalid API key", "Please check your API key in preferences");
        break;
      case 402:
        showToast(Toast.Style.Failure, "API key blocked", "Your API key has been blocked");
        break;
      case 403:
        showToast(Toast.Style.Failure, "Request limit exceeded", "Daily number of requests exceeded");
        break;
      case 413:
        showToast(Toast.Style.Failure, "Text too long", "The text you entered exceeds the maximum allowed size");
        break;
      case 501:
        showToast(
          Toast.Style.Failure,
          "Language not supported",
          "The specified translation direction is not supported",
        );
        break;
      default:
        if (httpStatus && httpStatus !== 200) {
          showToast(Toast.Style.Failure, `HTTP Error ${httpStatus}`, "Check your network connection or API key");
        } else {
          showToast(Toast.Style.Failure, "Unknown error", "Something went wrong with the request");
        }
    }
  };

  const lookup = async (word: string) => {
    if (!word) return;
    const pair = `${props.from}-${props.to}`;
    try {
      const { data, status } = (await lookupWord(apiKey, pair, word)) as { data: YandexLookupResponse; status: number };
      handleErrorCode(data.code, status);
      if (data.code === 200) {
        setResults(data.def.length > 0 ? data.def : null);
        await addToHistory({ query: word, from: props.from, to: props.to, date: new Date().toISOString() });
      } else {
        setResults(null);
      }
    } catch (err) {
      showToast(Toast.Style.Failure, "Error fetching translation", String(err));
    }
  };

  useEffect(() => {
    if (query) lookup(query);
  }, [query, props.from, props.to]);

  return (
    <List
      isLoading={!results && !!query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Yandex Dictionary"
      throttle
      searchText={query}
    >
      {results?.map((def, i) => (
        <List.Section key={i} title={`${def.text} ${def.ts ? `[${def.ts}]` : ""}`} subtitle={def.pos ?? ""}>
          {def.tr.map((t, j) => (
            <List.Item
              key={j}
              title={t.text}
              subtitle={[
                t.mean ? t.mean.map((m) => m.text).join(", ") : null,
                t.syn ? t.syn.map((s) => s.text).join(", ") : null,
              ]
                .filter(Boolean)
                .join(" • ")}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Translation" icon={Icon.Sidebar} content={t.text} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      <List.Section title="Attribution">
        <List.Item
          key="powered"
          title="Powered by Yandex.Dictionary"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser url="https://tech.yandex.com/dictionary/" title="Open Yandex.Dictionary" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

export default function Command(props: LaunchProps<{ arguments: YaDictionaryArgs }>) {
  const { query, from, to } = props.arguments;
  return <LookupView query={query} from={from} to={to} />;
}
