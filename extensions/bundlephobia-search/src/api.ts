import axios from "axios";
import { Package, SizeData } from "./types";

type SearchPackageResponse = Array<{ package: Package }>;

type SizeDataResponse = SizeData;

export const searchPackage = async (q: string) => {
  const { data } = await axios.get<SearchPackageResponse>(
    `https://api.npms.io/v2/search/suggestions?q=${q}`
  );

  return data.map((p) => p.package);
};

export const getSizeData = async (packageName: string) => {
  const { data } = await axios.get<SizeDataResponse>(
    `https://bundlephobia.com/api/size?package=${packageName}&record=true`
  );

  return data;
};
