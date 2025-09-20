import { FloorPriceResponse, VolumeResponse } from "../types";

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
  floorPrice?: FloorPriceResponse,
  volumeData?: VolumeResponse
) {
  const handleRoundValue = (value: number | undefined) => {
    if (!value) return "-";

    return value.toFixed(2);
  };

  return `
![Collection Image](${imageUrl})
 
${
  volumeData
    ? `
## Floor Price & Volumes (in ${volumeData?.currencyInfo.symbol})

| Floor | 1 Day | 7 Days | 30 Days | 
| -------- | -------- | -------- | -------- |
| ${handleRoundValue(floorPrice?.amount?.wholeAmount)} | ${handleRoundValue(
        volumeData?.oneDayVolume?.wholeAmount
      )} | ${handleRoundValue(volumeData?.sevenDayVolume?.wholeAmount)} | ${handleRoundValue(
        volumeData?.thirtyDayVolume?.wholeAmount
      )}  |
`
    : "(No volume data)"
}
  `;
}
