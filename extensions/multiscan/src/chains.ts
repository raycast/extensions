import { getPreferenceValues } from "@raycast/api";

interface ChainPreference {
  id: string;
  preferenceName: string;
}

const CHAIN_PREFERENCES: ChainPreference[] = [
  { id: "ethereum", preferenceName: "explorerEthereum" },
  { id: "base", preferenceName: "explorerBase" },
  { id: "arbitrum", preferenceName: "explorerArbitrum" },
  { id: "optimism", preferenceName: "explorerOptimism" },
  { id: "polygon", preferenceName: "explorerPolygon" },
  { id: "bsc", preferenceName: "explorerBSC" },
  { id: "avalanche", preferenceName: "explorerAvalanche" },
  { id: "fantom", preferenceName: "explorerFantom" },
  { id: "zksync", preferenceName: "explorerZkSync" },
  { id: "linea", preferenceName: "explorerLinea" },
  { id: "scroll", preferenceName: "explorerScroll" },
  { id: "mantle", preferenceName: "explorerMantle" },
  { id: "bitcoin", preferenceName: "explorerBitcoin" },
  { id: "solana", preferenceName: "explorerSolana" },
  { id: "cosmos", preferenceName: "explorerCosmos" },
  { id: "osmosis", preferenceName: "explorerOsmosis" },
  { id: "celestia", preferenceName: "explorerCelestia" },
  { id: "sui", preferenceName: "explorerSui" },
  { id: "aptos", preferenceName: "explorerAptos" },
  { id: "tron", preferenceName: "explorerTron" },
  { id: "ton", preferenceName: "explorerTON" },
  { id: "polkadot", preferenceName: "explorerPolkadot" },
  { id: "near", preferenceName: "explorerNEAR" },
];

export function getExplorerOverrides(): Map<string, string> {
  const prefs = getPreferenceValues<Record<string, string>>();
  const overrides = new Map<string, string>();

  for (const chain of CHAIN_PREFERENCES) {
    const override = prefs[chain.preferenceName];
    if (override && override.trim() !== "") {
      overrides.set(chain.id, override.trim().replace(/\/+$/, ""));
    }
  }

  return overrides;
}
