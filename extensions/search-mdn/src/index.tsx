import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import urljoin from "url-join";
import { useFetch } from "@raycast/utils";

export default function MDNSearchResultsList() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [locale, setLocale] = useState<string>("en-us");

  useEffect(() => {
    async function fetch() {
      if (!query) {
        setState([]);
        return;
      }
      setIsLoading(true);
      const results = await searchMDNByQuery(query, locale);
      setState(results);
      setIsLoading(false);
    }
    fetch();
  }, [query, locale]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search MDN..."
      onSearchTextChange={(text) => setQuery(text)}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Locale"
          storeValue={true}
          onChange={(newValue) => {
            setLocale(newValue);
          }}
        >
          {locales.map((loc) => (
            <List.Dropdown.Item key={loc.value} title={loc.title} value={loc.value} keywords={[loc.title, loc.value]} />
          ))}
        </List.Dropdown>
      }
    >
      {state.map((result, idx) => (
        <List.Item
          key={idx}
          title={result.title}
          icon="icon.png"
          subtitle={result.summary}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Document}
                title="Read Document"
                target={<Details result={result} locale={locale} />}
              />
              <Action.OpenInBrowser url={result.url} />
              <Action.CopyToClipboard content={result.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

const locales = [
  {
    value: "en-US",
    title: "English (US)",
  },
  {
    value: "es",
    title: "Español",
  },
  {
    value: "fr",
    title: "Français",
  },
  {
    value: "ja",
    title: "日本語",
  },
  {
    value: "ko",
    title: "한국어",
  },
  {
    value: "pt-BR",
    title: "Português (do Brasil)",
  },
  {
    value: "ru",
    title: "Русский",
  },
  {
    value: "zh-CN",
    title: "中文 (简体)",
  },
  {
    value: "zh-TW",
    title: "正體中文 (繁體)",
  },
];

interface Content {
  content: string;
  encoding: string;
}

const contentApiURL = "https://api.github.com/repos/mdn/content/contents";
const translatedContentApiURL = "https://api.github.com/repos/mdn/translated-content/contents";

const contentBlobURL = "https://github.com/mdn/content/blob/main";
const translatedContentBlobURL = "https://github.com/mdn/translated-content/blob/main";

const Details = (props: { result: Result; locale: string }) => {
  const file = "/files" + props.result.mdn_url.toLowerCase().replace("/docs/", "/") + "/index.md";
  const isEn = props.locale === "en-US";
  const url = `${isEn ? contentApiURL : translatedContentApiURL}${file}`;

  const { isLoading, data, revalidate } = useFetch<Content>(url);
  let content = Buffer.from(data?.content ?? "", (data?.encoding ?? "base64") as BufferEncoding).toString();

  // Remove markdown metadata on the top
  const sepIdx = content.indexOf("\n---\n", 3);
  if (sepIdx !== -1) {
    content = content.slice(sepIdx + 4, -1);
  }

  return (
    <Detail
      navigationTitle={`Search Web Docs - ${props.result.title}`}
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.result.url} />
          <Action.OpenInBrowser
            title="Source on GitHub"
            url={`${isEn ? contentBlobURL : translatedContentBlobURL}${file}`}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload"
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
};

type MDNResponse = {
  documents: Array<Result>;
};

type Result = {
  title: string;
  url: string;
  summary: string;
  mdn_url: string;
};

async function searchMDNByQuery(query: string, locale: string): Promise<Result[]> {
  try {
    const api = "https://developer.mozilla.org/api/v1/search";
    const params = {
      q: query,
      sort: "best",
      locale: locale,
    };
    const resp = await axios.get<MDNResponse>(api, { params });
    return resp.data.documents.map((document) => {
      document.url = urljoin("https://developer.mozilla.org", document.mdn_url);
      return document;
    });
  } catch (err) {
    showToast({
      style: Toast.Style.Failure,
      title: `Could not load MDN results`,
      message: String(err),
    });
    return Promise.resolve([]);
  }
}
