import { FloorPriceResponse } from "../types";

export function markdown(url: string) {
  return `![](${url})`;
}

export function markdownNFTDetail(imageUrl: string, name: string) {
  return `
![](${imageUrl})

# ${name}
  `;
}

export function markdownCollectionDetail(
  imageUrl: string | undefined,
  name: string | undefined,
  floorPrice: FloorPriceResponse | undefined
) {
  return `
![](${imageUrl})

# ${name}

### Floor Price: ${floorPrice?.amount.wholeAmount} ${floorPrice?.currencyInfo.symbol}
  `;
}
