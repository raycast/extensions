import { Detail } from "@raycast/api";
import groupBy from "lodash.groupby";
import { ItemPrice } from "../types";
import { getLocalizedName } from "../utils";

export default function ItemPrices(props: {
  name: string;
  prices: ItemPrice[];
}) {
  const generations = groupBy(props.prices, (p) =>
    getLocalizedName(
      p.versiongroup.generation.generationnames,
      p.versiongroup.generation.name,
    ),
  );

  return (
    <Detail
      navigationTitle={props.name}
      markdown={`## ${props.name} Prices

${Object.entries(generations)
  .map(([generation, groups]) => {
    return `### ${generation}
    
| Version | Purchase Price | Sell Price |
|---------|----------------|------------|
${groups
  .map((price) => {
    const title = price.versiongroup.versions
      .map((v) => getLocalizedName(v.versionnames, v.name))
      .join(" & ");
    return `| ${title} | ${price.purchase_price ? `$${price.purchase_price}` : "N/A"} | ${price.sell_price ? `$${price.sell_price}` : "N/A"} |`;
  })
  .join("\n")}\n`;
  })
  .join("\n")}
`}
    />
  );
}
