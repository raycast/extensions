import { Action, ActionPanel, Detail } from "@raycast/api";
import { useFetch, Response } from "@raycast/utils";

import type { AssetDetailModel } from "./types";
import { API_ASSET_URL, EXPLORER_ASSETS_URL, SHARE_LINKS, VERIFICATION_TIER_ICONS } from "./constants";

function AssetDetail({ id }: { id: number }) {
  const { data, isLoading } = useFetch(`${API_ASSET_URL}${id}/`, {
    parseResponse,
    initialData: [],
    keepPreviousData: true,
  });

  const markdown = `
  # ${data.name} #${data.asset_id} <img src="${
    VERIFICATION_TIER_ICONS[data.verification_tier]
  }" width="18" height="18"/>

  _is ${data.verification_tier} by __Pera Wallet___

   This is a well-known and established project in the Algorand ecosystem.

  <img src="${data.logo_svg || data.logo}" width="112" height="112"/>

  
  
  ${
    data.description &&
    `## Description:
  ${data.description}
  `
  }
  `;

  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="See on Pera Explorer" url={`${EXPLORER_ASSETS_URL}${data.asset_id}`} />

          <Action.CopyToClipboard title="Copy Asset Id" content={data.asset_id} />

          {data?.creator?.address && (
            <Action.CopyToClipboard title="Copy Creator Address" content={data.creator.address} />
          )}

          <ActionPanel.Section title="Share on">
            <Action.CopyToClipboard title={"Copy URL"} content={`${EXPLORER_ASSETS_URL}${data.asset_id}/`} />

            {SHARE_LINKS.map(({ title, url }) => (
              <Action.OpenInBrowser key={title} title={title} url={`${url}${data.asset_id}/`} />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
      isLoading={isLoading}
      navigationTitle={data.name}
      markdown={markdown}
      metadata={
        data && (
          <Detail.Metadata>
            {data?.project_url && (
              <Detail.Metadata.Link title="Official Project Website" text="See website" target={data.project_url} />
            )}

            <Detail.Metadata.Link
              title="Algo Explorer Page"
              text="See on Algo Explorer"
              target={`https://algoexplorer.io/asset/${data.asset_id}`}
            />

            <Detail.Metadata.Separator />

            <Detail.Metadata.Label title="Project Name" text={data.project_name} />

            {data.verification_tier && (
              <Detail.Metadata.TagList title="Verification Tier">
                <Detail.Metadata.TagList.Item text={data.verification_tier} color={"#eed535"} />
              </Detail.Metadata.TagList>
            )}

            {data?.total_supply && (
              <Detail.Metadata.Label
                title="Total Supply"
                text={Intl.NumberFormat("en-US", {
                  notation: "compact",
                  maximumFractionDigits: data?.fraction_decimals || 2,
                }).format(data.total_supply / Math.pow(10, data?.fraction_decimals || 0))}
              />
            )}

            {data?.creator?.address && (
              <Detail.Metadata.Link
                title="See Creator"
                text={data.creator.address}
                target={`https://algoexplorer.io/address/${data.creator.address}`}
              />
            )}

            <Detail.Metadata.Label title="Network" text={"Mainnet"} />

            <Detail.Metadata.Separator />

            {data?.discord_url && (
              <Detail.Metadata.Link title="Discord" text={data.discord_url} target={data.discord_url} />
            )}

            {data?.telegram_url && (
              <Detail.Metadata.Link title="Telegram" text={data.telegram_url} target={data.telegram_url} />
            )}

            {data?.twitter_username && (
              <Detail.Metadata.Link
                title="Twitter"
                text={`@${data.twitter_username}`}
                target={`https://twitter.com/${data.twitter_username}`}
              />
            )}
          </Detail.Metadata>
        )
      }
    />
  );
}

async function parseResponse(response: Response): Promise<AssetDetailModel> {
  const json = (await response.json()) as AssetDetailModel | { code: string; message: string };

  if (!response.ok || "message" in json) {
    throw new Error("message" in json ? json.message : response.statusText);
  }

  return json;
}

export default AssetDetail;
