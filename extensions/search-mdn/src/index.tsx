import { Action, ActionPanel, Detail, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import urljoin from "url-join";
import { useFetch } from "@raycast/utils";

const { locale } = getPreferenceValues<{ locale: string }>();

export default function MDNSearchResultsList() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetch() {
      if (!query) {
        setState([]);
        return;
      }
      setIsLoading(true);
      const results = await searchMDNByQuery(query);
      setState(results);
      setIsLoading(false);
    }
    fetch();
  }, [query]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search MDN..."
      onSearchTextChange={(text) => setQuery(text)}
      throttle
    >
      {state.map((result, idx) => (
        <List.Item
          key={idx}
          title={result.title}
          icon="icon.png"
          subtitle={result.summary}
          actions={
            <ActionPanel>
              <Action.Push icon={Icon.Document} title="Read Document" target={<Details {...result} />} />
              <Action.OpenInBrowser url={result.url} />
              <Action.CopyToClipboard content={result.url} shortcut={{ modifiers: ["cmd"], key: "." }} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

interface Content {
  content: string;
  encoding: string;
}

const contentURL = "https://api.github.com/repos/mdn/content/contents";

const Details = (props: Result) => {
  const file = "/files" + props.mdn_url.toLowerCase().replace("/docs/", "/") + "/index.md";
  const url = `${contentURL}${file}`;
  const { isLoading, data, revalidate } = useFetch<Content>(url);
  return (
    <Detail
      navigationTitle={`Search Web Docs - ${props.title}`}
      isLoading={isLoading}
      markdown={Buffer.from(data?.content ?? "", (data?.encoding ?? "base64") as BufferEncoding).toString()}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Source on GitHub" url={`https://github.com/mdn/content/blob/main${file}`} />
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

async function searchMDNByQuery(query: string): Promise<Result[]> {
  try {
    const response = await axios.get<MDNResponse>(`https://developer.mozilla.org/api/v1/search`, {
      params: {
        q: query,
        sort: "best",
        locale: locale,
      },
    });
    return response.data.documents.map((document) => {
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
