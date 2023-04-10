import { ActionPanel, Action, Grid, Icon, Image } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";
import { useState } from "react";

import AssetDetail from "./AssetDetail";
import { ASSET_LOGO_OPTS, API_SEARCH_URL } from "./constants";

import type { AssetModel } from "./types";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const params = new URLSearchParams({ q: searchText });

  const { data, isLoading } = useFetch(API_SEARCH_URL + params.toString(), {
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  return (
    <Grid
      itemSize={Grid.ItemSize.Medium}
      inset={Grid.Inset.Small}
      enableFiltering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search any ASA or NFT on Algorand"
    >
      {data.length === 0 && (
        <Grid.EmptyView icon={Icon.Binoculars} title="Could't find anything matching your search or filter." />
      )}

      {data.map((asset) => (
        <Grid.Item
          key={asset.id}
          content={{
            source: `${asset.logo}?${ASSET_LOGO_OPTS.toString()}`,
            fallback: Icon.EyeDisabled,
            mask: Image.Mask.Circle,
          }}
          title={asset.name}
          subtitle={asset.unit}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" icon={Icon.Sidebar} target={<AssetDetail id={asset.id} />} />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

async function parseResponse(response: Response): Promise<SearchResult[]> {
  const json = (await response.json()) as { results: AssetModel[] } | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json.results.map((asset) => ({
    id: asset.asset_id,
    name: asset.name,
    logo: asset.logo,
    unit: asset.unit_name,
    tier: asset.verification_tier,
  }));
}

interface SearchResult {
  id: number;
  name: string;
  logo: string;
  unit: string;
  tier: string;
}
