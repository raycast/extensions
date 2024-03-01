export const ApiUrls = {
  getAsset: (address: string, tokenId: string) => `https://api.center.dev/v1/ethereum-mainnet/${address}/${tokenId}`,
  getAssetTransfers: (network: string, address: string, tokenId: string) =>
    `https://api.center.dev/v1/${network}/transfers?collection=${address}&tokenID=${tokenId}`,
  getFloorPriceOfCollection: (network: string, address: string) =>
    `https://api.center.dev/v1/${network}/${address}/market-data/floor-price`,
  getVolumeOfCollection: (network: string, address: string) =>
    `https://api.center.dev/v1/${network}/${address}/market-data/volume`,
  getCollection: (network: string, address: string) => `https://api.center.dev/v1/${network}/${address}`,
  getContractsOfOwner: (network: string, address: string) =>
    `https://api.center.dev/v2/${network}/${address}/nfts-owned`,
  search: (network: string, query: string) => {
    const url = new URL(`https://api.center.dev/v1/${network}/search`);
    if (query) url.searchParams.append("query", query);
    return url.toString();
  },
};
