// @ts-nocheck
import {
  ActionPanel,
  Action,
  showToast,
  Toast,
  Icon,
  Detail,
  List,
  useNavigation,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { queryWubiEncoding } from "./api";
import { WubiSearchResult } from "./types";
import { downloadAndCacheImage, getLocalImagePath } from "./imageCache";

interface Arguments {
  hanzi: string;
}

function WubiDetail({ result }: { result: WubiSearchResult }): ReactElement {
  const [localImagePath, setLocalImagePath] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      setIsLoadingImage(true);
      // Check local cache first
      let imagePath = getLocalImagePath(result.hanzi);

      if (!imagePath) {
        // Download image if not cached
        imagePath = await downloadAndCacheImage(result.hanzi, result.imageUrl);
      }

      setLocalImagePath(imagePath);
      setIsLoadingImage(false);
    };

    loadImage();
  }, [result.hanzi, result.imageUrl]);

  const markdown = `
# ${result.hanzi} Wubi Encoding Details

## 📋 Encoding Information
**Wubi 86**: ${result.c86} ${
    result.c86j !== "-" ? `(Short: ${result.c86j})` : ""
  } | **Wubi 98**: ${result.c98} ${
    result.c98j !== "-" ? `(Short: ${result.c98j})` : ""
  } | **Pinyin**: ${result.py} | **Strokes**: ${result.bh}

## 🖼️ Character Decomposition
${
  isLoadingImage
    ? "⏳ Loading decomposition diagram..."
    : localImagePath
    ? `![Decomposition](file://${encodeURI(localImagePath)})`
    : "❌ Failed to load decomposition diagram. Please click 'View Decomposition' button below to view in browser."
}
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Wubi 86"
            content={result.c86}
            icon={Icon.Clipboard}
          />
          <Action.CopyToClipboard
            title="Copy Wubi 98"
            content={result.c98}
            icon={Icon.Clipboard}
          />
          <Action.OpenInBrowser
            title="View Decomposition"
            url={result.imageUrl}
            icon={Icon.Image}
          />
          <Action.CopyToClipboard
            title="Copy Image URL"
            content={result.imageUrl}
            icon={Icon.Link}
          />
        </ActionPanel>
      }
    />
  );
}

export default function SearchWubiCommand(
  props: LaunchProps<{ arguments: Arguments }>
) {
  const { hanzi } = props.arguments;
  const [searchText, setSearchText] = useState(hanzi || "");
  const [results, setResults] = useState<WubiSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { push } = useNavigation();

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // Only search Chinese characters
    if (!/[\u4e00-\u9fa5]/.test(query)) {
      showToast(
        Toast.Style.Failure,
        "Please enter Chinese characters",
        "Only Chinese characters are supported"
      );
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await queryWubiEncoding(query);
      setResults(searchResults);

      if (searchResults.length === 0) {
        showToast(
          Toast.Style.Failure,
          "No results found",
          `No Wubi encoding found for "${query}"`
        );
      }
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Search failed",
        error instanceof Error ? error.message : "Unknown error"
      );
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 如果传入了参数，自动执行查询
  useEffect(() => {
    if (hanzi && hanzi.trim()) {
      performSearch(hanzi.trim());
    }
  }, [hanzi, performSearch]);

  // 实时搜索：用户停止输入300ms后自动查询（提高响应速度）
  useEffect(() => {
    if (searchText.trim() && searchText.trim() !== hanzi) {
      const timeoutId = setTimeout(() => {
        performSearch(searchText.trim());
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchText, performSearch, hanzi]);

  const getAccessories = (result: WubiSearchResult) => {
    const accessories = [];

    accessories.push({ text: `${result.c86}`, icon: Icon.Keyboard });

    if (result.c98 !== result.c86) {
      accessories.push({ text: `98:${result.c98}`, icon: Icon.Keyboard });
    }

    accessories.push({ text: `♪${result.py}`, icon: Icon.SpeakerOn });

    return accessories;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter Chinese characters to query Wubi encoding..."
      throttle
      actions={
        <ActionPanel>
          <Action
            title="Search Now"
            icon={Icon.MagnifyingGlass}
            onAction={() => {
              if (searchText.trim()) {
                performSearch(searchText.trim());
              }
            }}
          />
        </ActionPanel>
      }
    >
      {searchText && !isLoading && results.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No results found"
          description="Please enter Chinese characters to query Wubi encoding"
        />
      ) : results.length > 0 ? (
        <List.Section title={`Found ${results.length} results`}>
          {results.map((result, index) => (
            <List.Item
              key={`${result.hanzi}-${index}`}
              title={result.hanzi}
              subtitle={`${result.bh} strokes`}
              accessories={getAccessories(result)}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details"
                    icon={Icon.Eye}
                    onAction={() => push(<WubiDetail result={result} />)}
                  />
                  <Action.CopyToClipboard
                    title="Copy Wubi 86"
                    content={result.c86}
                    icon={Icon.Clipboard}
                  />
                  <Action.CopyToClipboard
                    title="Copy Wubi 98"
                    content={result.c98}
                    icon={Icon.Clipboard}
                  />
                  <Action.OpenInBrowser
                    title="View Decomposition"
                    url={result.imageUrl}
                    icon={Icon.Image}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.Document}
          title="Enter Chinese characters to start"
          description="Support querying multiple characters at once (e.g.: Wubi encoding). Press Enter to search immediately, or wait 300ms for auto search."
        />
      )}
    </List>
  );
}
