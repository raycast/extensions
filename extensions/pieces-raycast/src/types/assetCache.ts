import { StrippedAsset } from "./strippedAsset";

export type AssetsCache = {
  indicies: { [key: string]: number | undefined };
  assets: StrippedAsset[];
};
