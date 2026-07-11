import { ChainInfo } from "../types/api";
import formatEcosystems from "./formatEcosystems";

const KEYS_TO_SEARCH: Array<keyof ChainInfo> = ["name", "description", "ecosystem", "rollupType", "chainId"];

const filterChains = (searchText: string, activeEcosystem: string) => (chain: ChainInfo) => {
  if (activeEcosystem && activeEcosystem !== "All") {
    const chainEcosystems = formatEcosystems(chain.ecosystem);
    return chainEcosystems.includes(activeEcosystem);
  }

  if (!searchText) {
    return true;
  }

  const searchTextLower = searchText.toLowerCase();

  return KEYS_TO_SEARCH.some((key) => {
    const value = chain[key];

    if (typeof value === "string") {
      return value.toLowerCase().includes(searchTextLower);
    }

    return false;
  });
};

export default filterChains;
