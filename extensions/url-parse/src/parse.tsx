import {
  showToast,
  Toast,
  List,
  Action,
  ActionPanel,
  confirmAlert,
  Keyboard,
  Icon,
  Alert,
  Color,
  Image,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getFavicon, useCachedState } from "@raycast/utils";

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
    const { href, protocol, hostname, port, origin, hash, pathname: path, searchParams: queries } = new URL(url);
    return {
      href,
      protocol,
      hostname,
      port,
      origin,
      hash,
      path: decodeURIComponent(path),
      queries: Object.fromEntries(queries),
    };
  } catch {
    showToast({
      title: "URL parse failed!",
      style: Toast.Style.Failure,
    });
  }
}

function toMarkdown(url: Detail) {
  return [
    "## URL Details",
    `- ${url.href.length} characters.`,
    `\`\`\`json\n${JSON.stringify(url, null, 2)}\n\`\`\``,
  ].join("\n\n");
}

function isURLLike(url: string) {
  const reg = /^[a-zA-Z]+:\/\/.+/gi;
  return reg.test(url.trim());
}

export default function Command() {
  const [inputText, setInputText] = useState("");
  const [urls, setUrls] = useCachedState<Detail[]>("urls", []);
  const [filteredUrls, setFilteredUrls] = useState(urls.slice());

  const handleParse = useCallback(() => {
    const text = trim(inputText);
    if (!text) {
      showToast({
        title: "Please input a url!",
        style: Toast.Style.Failure,
      });
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
    await confirmAlert({
      title: "Are you sure?",
      message: "Clearing the history can't be reverted",
      icon: { source: Icon.MinusCircle, tintColor: Color.Red },
      primaryAction: {
        title: "Yes",
        style: Alert.ActionStyle.Destructive,
        onAction: () => {
          setUrls([]);
        },
      },
      rememberUserChoice: true,
    });
  }, []);

  const handleDelete = useCallback(
    (detail: Detail) => {
      setUrls(urls.filter((item) => item.href !== detail.href));
    },
    [urls],
  );

  useEffect(() => {
    setFilteredUrls(inputText.trim() ? urls.filter((item) => item.href.includes(trim(inputText))) : urls);
  }, [urls, inputText]);

  const CommonActions = useMemo(() => {
    return (
      <Action
        title="Clear History"
        icon={Icon.MinusCircle}
        style={Action.Style.Destructive}
        shortcut={Keyboard.Shortcut.Common.RemoveAll}
        onAction={handleClear}
      />
    );
  }, [handleClear]);

  return (
    <List
      isShowingDetail
      searchText={inputText}
      onSearchTextChange={(text) => setInputText(text)}
      searchBarPlaceholder="Input to parse or search"
    >
      <List.EmptyView
        description={inputText ? `Press Enter to parse ${inputText}` : `Input url to parse.`}
        actions={
          <ActionPanel title="Actions">
            <>
              <Action title="Parse URL" onAction={handleParse} icon={Icon.Globe} />
              {filteredUrls.length > 0 && CommonActions}
            </>
          </ActionPanel>
        }
      />
      {filteredUrls.map((url) => (
        <List.Item
          key={url.href}
          title={url.href}
          icon={getFavicon(url.href, { mask: Image.Mask.Circle, fallback: "link.png" })}
          actions={
            <ActionPanel>
              {isURLLike(inputText) && <Action title="Parse URL" onAction={handleParse} icon={Icon.Globe} />}
              <ActionPanel.Submenu title="Copy" icon={Icon.CopyClipboard}>
                <Action.CopyToClipboard title={"Href"} content={url.href} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard title={"Protocol"} content={url.protocol} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard title={"Hostname"} content={url.hostname} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard title={"Port"} content={url.port} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard title={"Origin"} content={url.origin} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard title={"Hash"} content={url.hash ?? ""} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard title={"Path"} content={url.path ?? ""} icon={Icon.CopyClipboard} />
                <Action.CopyToClipboard
                  title={"Queries"}
                  content={JSON.stringify(url.queries)}
                  icon={Icon.CopyClipboard}
                />
              </ActionPanel.Submenu>
              <ActionPanel.Submenu title="Paste" icon={Icon.CopyClipboard}>
                <Action.Paste title={"Href"} content={url.href} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Protocol"} content={url.protocol} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Hostname"} content={url.hostname} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Port"} content={url.port} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Origin"} content={url.origin} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Hash"} content={url.hash ?? ""} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Path"} content={url.path ?? ""} icon={Icon.CopyClipboard} />
                <Action.Paste title={"Queries"} content={JSON.stringify(url.queries)} icon={Icon.CopyClipboard} />
              </ActionPanel.Submenu>
              <ActionPanel.Section>
                <Action
                  title="Delete"
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  onAction={() => handleDelete(url)}
                />
                {CommonActions}
              </ActionPanel.Section>
            </ActionPanel>
          }
          detail={<List.Item.Detail markdown={toMarkdown(url)} />}
        />
      ))}
    </List>
  );
}
