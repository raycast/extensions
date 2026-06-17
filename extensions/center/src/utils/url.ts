const CENTER_HOST = "https://center.app";

export const getCollectionCenterUrl = (network: string, address: string) => {
  return `${CENTER_HOST}/${network}/collections/${address}/`;
};

export const getAssetCenterUrl = (network: string, address: string, tokenId: string) => {
  return `${CENTER_HOST}/${network}/collections/${address}/${tokenId}/`;
};
