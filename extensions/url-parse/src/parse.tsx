import { showToast, Toast, List, Action, ActionPanel, confirmAlert, Keyboard } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useCachedState } from "@raycast/utils";

function trim(url: string) {
  return url.trim();
}

interface Detail {
  href: string;
  protocol: string;
  hostname: string;
  port: string;
  origin: string;
  hash?: string;
  path?: string;
  queries?: Record<string, string | null | undefined>;
}

function parse(url: string): Detail | undefined {
  try {
    const instance = new URL(url);
    return {
      href: instance.href,
      protocol: instance.protocol,
      hostname: instance.hostname,
      port: instance.port,
      origin: instance.origin,
      hash: instance.hash,
      path: decodeURIComponent(instance.pathname),
      queries: [...instance.searchParams.keys()].reduce(
        (o, k) => {
          o[k] = instance.searchParams.get(k);
          return o;
        },
        {} as Record<string, string | null>,
      ),
    };
  } catch {
    showToast({
      title: "URL parse failed!",
      style: Toast.Style.Failure,
    });
  }
}

function toMarkdown(url: Detail) {
  return ["## Detail", `- ${url.href.length} characters.`, `\`\`\`json\n${JSON.stringify(url, null, 2)}\n\`\`\``].join(
    "\n\n",
  );
}

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [urls, setUrls] = useCachedState<Detail[]>("urls", []);
  const [filteredUrls, setFilteredUrls] = useState(urls.slice());

  const handleParse = useCallback(() => {
    const text = trim(inputText);
    if (!text) {
      return;
    }
    if (urls.find((item) => item.href === text)) {
      return;
    }
    const url = parse(text);
    if (!url) {
      return;
    }
    setUrls([url].concat(...urls));
    setInputText("");
    showToast({
      title: "Success",
      style: Toast.Style.Success,
    });
  }, [urls, inputText]);

  const handleClear = useCallback(async () => {
    if (await confirmAlert({ title: "Are you sure?" })) {
      setUrls([]);
    }
  }, []);

  useEffect(() => {
    if (inputText.trim()) {
      setFilteredUrls(urls.filter((item) => item.href.indexOf(trim(inputText)) !== -1));
    } else {
      setFilteredUrls([...urls]);
    }
  }, [urls, inputText]);

  const shouldShowParseAction = useMemo(
    () => trim(inputText) && !urls.find((item) => item.href === trim(inputText)),
    [urls, inputText],
  );

  return (
    <List
      isShowingDetail
      searchText={inputText}
      onSearchTextChange={(text) => setInputText(text)}
      searchBarPlaceholder="Input to parse or search"
      actions={
        <ActionPanel title="Actions">
          <Action title="Parse URL" onAction={handleParse} />
          <Action
            title="Clear History"
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={handleClear}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView description={inputText ? `Press Enter to parse ${inputText}` : `Input url to parse.`} />
      {filteredUrls.map((url) => (
        <List.Item
          key={url.href}
          title={url.href}
          actions={
            shouldShowParseAction && (
              <ActionPanel>
                <Action title="Parse URL" onAction={handleParse} />
              </ActionPanel>
            )
          }
          detail={<List.Item.Detail markdown={toMarkdown(url)} />}
        />
      ))}
    </List>
  );
}
