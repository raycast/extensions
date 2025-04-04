import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  Grid,
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";

interface Preferences {
  accessToken: string;
}

interface GyazoImage {
  image_id: string;
  permalink_url: string;
  thumb_url: string;
  url: string;
  type: string;
  created_at: string;
  metadata: {
    app: string | null;
    title: string | null;
    url: string | null;
    desc: string;
  };
  ocr?: {
    locale: string;
    description: string;
  };
}

export default function Command() {
  const { accessToken } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [columns, setColumns] = useState(5);
  const [page, setPage] = useState(1);
  const perPage = 20; // 固定値
  const [images, setImages] = useState<GyazoImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Gyazo API から画像を取得する関数
  const fetchGyazoImages = async (query: string, page = 1, per = 20): Promise<GyazoImage[]> => {
    if (!accessToken) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Access Token Missing",
        message: "Please set your Gyazo access token in extension preferences",
      });
      await openExtensionPreferences();
      return [];
    }

    try {
      setIsLoading(true);
      let url: URL;
      if (query.trim() === "") {
        // クエリが空の場合は List API を使用
        url = new URL("https://api.gyazo.com/api/images");
        url.searchParams.append("access_token", accessToken);
        url.searchParams.append("page", page.toString());
        url.searchParams.append("per_page", per.toString());
      } else {
        // 検索クエリがある場合は Search API を使用
        url = new URL("https://api.gyazo.com/api/search");
        url.searchParams.append("access_token", accessToken);
        url.searchParams.append("query", query);
        url.searchParams.append("page", page.toString());
        url.searchParams.append("per", per.toString());
      }

      // Make the API request
      const response = await fetch(url.toString());

      if (!response.ok) {
        const errorText = await response.text();
        setIsLoading(false);
        await showToast({
          style: Toast.Style.Failure,
          title: `API Error (${response.status})`,
          message: errorText || "Failed to fetch images from Gyazo",
        });
        return [];
      }

      const data = await response.json();
      setIsLoading(false);
      return data as GyazoImage[];
    } catch (error) {
      setIsLoading(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch images",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return [];
    }
  };

  // 検索テキストの変更を受け取るハンドラー
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
  };

  // 入力が変化した際、0.5秒後に debouncedSearchText を更新する
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setPage(1); // 新しい検索の場合はページをリセット
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // debouncedSearchText が更新されたときに画像一覧を取得
  useEffect(() => {
    const performSearch = async () => {
      const results = await fetchGyazoImages(debouncedSearchText, 1, perPage);
      setImages(results);
    };

    performSearch();
  }, [debouncedSearchText]);

  // Load more images（ページネーション）
  const loadMore = async () => {
    const nextPage = page + 1;
    const moreImages = await fetchGyazoImages(debouncedSearchText, nextPage, perPage);
    if (moreImages.length > 0) {
      setImages([...images, ...moreImages]);
      setPage(nextPage);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "No more images",
        message: "You've reached the end of the results",
      });
    }
  };

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search Gyazo images..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Grid Item Size"
          storeValue
          onChange={(newValue) => {
            setColumns(parseInt(newValue));
          }}
        >
          <Grid.Dropdown.Item title="Large" value={"3"} />
          <Grid.Dropdown.Item title="Medium" value={"5"} />
          <Grid.Dropdown.Item title="Small" value={"8"} />
        </Grid.Dropdown>
      }
      navigationTitle="Gyazo Search"
      filtering={false}
    >
      {images.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Images Found"
          description={searchText ? "Try a different search term" : "Start typing to search your Gyazo images"}
        />
      ) : (
        images.map((image) => (
          <Grid.Item
            key={image.image_id}
            content={{
              source: image.thumb_url,
              fallback: "extension-icon.png",
            }}
            title={image.metadata?.title || "Untitled"}
            subtitle={new Date(image.created_at).toLocaleDateString()}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Permalink to Clipboard"
                  content={image.permalink_url}
                  onCopy={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Permalink Copied to Clipboard",
                    });
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Image URL to Clipboard"
                  content={image.url}
                  onCopy={() => {
                    showToast({
                      style: Toast.Style.Success,
                      title: "Image URL Copied to Clipboard",
                    });
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
                <Action.OpenInBrowser title="Open in Browser" url={image.permalink_url} />
                <Action
                  title="Load More Images"
                  icon={Icon.Plus}
                  onAction={loadMore}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </Grid>
  );
}
