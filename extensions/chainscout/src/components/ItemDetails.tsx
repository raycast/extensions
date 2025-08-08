import { Color, Detail } from "@raycast/api";
import React from "react";
import { ChainInfo } from "../types/api";
import upperFirst from "../utils/upperFirst";
import formatEcosystems from "../utils/formatEcosystems";
import prettifyLink from "../utils/prettifyLink";

interface Props {
  data: ChainInfo;
}

const ItemDetails = ({ data }: Props) => {
  const ecosystems = formatEcosystems(data.ecosystem);

  return (
    <Detail
      markdown={`# ${data.name}\n\n${data.description}`}
      metadata={
        <Detail.Metadata>
          {ecosystems.length > 0 && (
            <Detail.Metadata.Label title="Ecosystem" text={ecosystems.map(upperFirst).join(", ")} />
          )}
          <Detail.Metadata.Label title="Chain ID" text={data.chainId} />
          {data.rollupType && <Detail.Metadata.Label title="Rollup Type" text={upperFirst(data.rollupType)} />}
          <Detail.Metadata.TagList title="Tags">
            <Detail.Metadata.TagList.Item text={`L${data.layer}`} color={Color.Yellow} />
            <Detail.Metadata.TagList.Item
              text={data.isTestnet ? "Testnet" : "Mainnet"}
              color={data.isTestnet ? Color.Red : Color.Green}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {data.explorers.map((explorer, index) => (
            <Detail.Metadata.Link
              key={explorer.url}
              title={`Explorer${data.explorers.length > 1 ? ` ${index + 1}` : ""}`}
              target={explorer.url}
              text={prettifyLink(explorer.url)}
            />
          ))}
          {data.website && (
            <Detail.Metadata.Link title="Website" target={data.website} text={prettifyLink(data.website)} />
          )}
        </Detail.Metadata>
      }
    />
  );
};

export default ItemDetails;
