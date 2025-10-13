import { Action, ActionPanel, getPreferenceValues, Grid, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";

export default function Assets() {
  const [searchText, setSearchText] = useState("");

  type Category = {
    slug: string;
    title: string;
    parent: Category | null;
  };
  type Tag = {
    slug: string;
    title: string;
  };
  type Collection = Tag;
  type Asset = {
    slug: string;
    filename: string;
    public: boolean;
    publicUrl: string;
    title: string | null;
    description: string | null;
    mime: string;
    url: string | null;
    width: number;
    height: number;
    category: Category | null;
    tags: Tag[];
    collections: Collection[];
  };
  type AssetsResult = {
    assets: Asset[];
    page: number;
    pages: number;
    total: number;
  };
  const { api_key, workspace_url } = getPreferenceValues<Preferences>();
  const {
    isLoading,
    data: assets,
    pagination,
  } = useFetch(
    (options) =>
      new URL("api/assets", workspace_url) +
      "?" +
      new URLSearchParams({ page: String(options.page + 1), s: searchText }).toString(),
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${api_key}`,
      },
      mapResult(result: AssetsResult) {
        return {
          data: result.assets,
          hasMore: result.page !== result.pages,
        };
      },
      initialData: [],
      keepPreviousData: true,
    },
  );

  return (
    <Grid
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder="Search asset"
      onSearchTextChange={setSearchText}
      throttle
    >
      {assets.map((asset, assetIndex) => (
        <Grid.Item
          key={assetIndex}
          title={asset.title || "<untitled>"}
          subtitle={asset.slug}
          content={asset.publicUrl}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.ArrowNe} title="Open Embed URL" url={asset.publicUrl} />
              <Action.OpenInBrowser
                icon="daminik.png"
                title="Edit in Workspace"
                url={new URL(`file/edit/${asset.filename}`, workspace_url).toString()}
              />
              <Action.CopyToClipboard
                title="Copy Public URL"
                content={asset.publicUrl}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}
