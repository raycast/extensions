import { showToast, Clipboard, Toast, List, Action, ActionPanel, confirmAlert } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { useCachedState } from "@raycast/utils";

function cleanURL(url: string) {
  return decodeURIComponent(url.trim());
}

class UrlDetail {
  href: string;
  protocol: string;
  hostname: string;
  port: string;
  origin: string;
  hash?: string;
  query?: Record<string, string | null | undefined>;

  constructor(url: string) {
    const instance = new URL(cleanURL(url));
    this.href = instance.href;
    this.protocol = instance.protocol;
    this.hostname = instance.hostname;
    this.port = instance.port;
    this.origin = instance.origin;
    this.hash = instance.hash;
    this.query = [...instance.searchParams.keys()].reduce(
      (o, k) => {
        o[k] = instance.searchParams.get(k);
        return o;
      },
      {} as Record<string, string | null>,
    );
  }
}

function toMarkdown(url: UrlDetail) {
  return [
    "## Input",
    `- URL: [${url.href}](${url.href})`,
    `- Length: ${url.href.length}`,
    "## JSON",
    `\`\`\`json\n${JSON.stringify(url, null, 2)}\n\`\`\``,
  ].join("\n\n");
}

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [urls, setUrls] = useCachedState<UrlDetail[]>("urls", []);
  const [filteredList, setFilteredList] = useState(urls);

  const parseURL = useCallback((text: string) => {
    try {
      const url = new UrlDetail(text);
      setUrls((list) => {
        const index = list.findIndex((item) => item.href === url.href);
        if (index === -1) {
          return [url].concat(...list);
        } else {
          const [item] = list.splice(index, 1);
          return [item].concat(...list);
        }
      });
      setInputText("");
      showToast({
        title: "Success",
        style: Toast.Style.Success,
      });
    } catch (err) {
      showToast({
        title: "URL parse failed!",
        style: Toast.Style.Failure,
      });
    }
  }, []);

  const handleClear = useCallback(async () => {
    if (await confirmAlert({ title: "Are you sure?" })) {
      setUrls([]);
    }
  }, []);

  useEffect(() => {
    Clipboard.readText().then((text) => {
      if (!text) {
        return;
      }
      parseURL(text);
    });
  }, [parseURL]);

  useEffect(() => {
    if (inputText.trim()) {
      setFilteredList(urls.filter((item) => item.href.indexOf(cleanURL(inputText)) !== -1));
    } else {
      setFilteredList([...urls]);
    }
  }, [urls, inputText]);

  return (
    <List
      isShowingDetail
      searchText={inputText}
      onSearchTextChange={(text) => setInputText(text)}
      searchBarPlaceholder="Input to parse or search"
      actions={
        <ActionPanel title="Actions">
          <Action title="Parse URL" onAction={() => parseURL(inputText)} />
          <Action title="Clear History" onAction={handleClear} />
        </ActionPanel>
      }
    >
      <List.EmptyView description={inputText ? `Press Enter to parse ${inputText}` : `Input url to parse.`} />
      {filteredList.map((url) => (
        <List.Item key={url.href} title={url.href} detail={<List.Item.Detail markdown={toMarkdown(url)} />} />
      ))}
    </List>
  );
}
