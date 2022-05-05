import {
  ActionPanel,
  CopyToClipboardAction,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  useNavigation,
} from "@raycast/api";
import axios from "axios";
import { useEffect, useState } from "react";
import urljoin from "url-join";

const { locale } = getPreferenceValues<{ locale: string }>();

export default function MDNSearchResultsList() {
  const [query, setQuery] = useState<null | string>(null);
  const [state, setState] = useState<Result[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { push } = useNavigation();

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
          id={idx.toString()}
          key={idx}
          title={result.title}
          icon="icon.png"
          subtitle={result.summary}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Show Details"
                icon={Icon.Sidebar}
                onAction={() => push(<Details {...result} />)}
              />
              <OpenInBrowserAction url={result.url} />
              <CopyToClipboardAction
                title="Copy URL"
                content={result.url}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function Details(props: Result) {
  const { title, summary, url } = props;

  return (
    <Detail
      markdown={`# ${title}\n## Summary\n${summary}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={url} />
          <CopyToClipboardAction title="Copy URL" content={url} />
        </ActionPanel>
      }
    />
  );
}

type MDNResponse = {
  documents: Array<{
    title: string;
    mdn_url: string;
    summary: string;
  }>;
};

type Result = {
  title: string;
  url: string;
  summary: string;
};

async function searchMDNByQuery(query: string): Promise<Result[]> {
  try {
    const response = await axios.get<MDNResponse>(`https://developer.mozilla.org/api/v1/search/${locale}`, {
      params: {
        q: query,
        sort: "best",
      },
    });
    return response.data.documents.map((document) => ({
      title: document.title,
      summary: document.summary,
      url: urljoin("https://developer.mozilla.org", document.mdn_url),
    }));
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `Could not load MDN results. ${error}`);
    return Promise.resolve([]);
  }
}
