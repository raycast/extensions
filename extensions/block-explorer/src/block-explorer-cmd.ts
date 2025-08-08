import { LaunchProps, open, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { chains, ChainConfig } from "./chains";

type QueryTypes = "address" | "transaction" | "block";

export default async function Command(props: LaunchProps) {
  const { query, chain } = props.arguments;

  try {
    // Get custom chains from LocalStorage
    const customChainsStr = await LocalStorage.getItem<string>("custom-chains");
    let customChains: Record<string, ChainConfig> = {};
    try {
      customChains = customChainsStr ? JSON.parse(customChainsStr) : {};
    } catch (error) {
      showFailureToast(error, { title: "Error Parsing Custom Chains" });
    }

    const allChains = { ...chains, ...customChains };

    // Get default chain from LocalStorage if no chain is specified
    let selectedChain = chain;
    if (!selectedChain) {
      const defaultChain = await LocalStorage.getItem<string>("default-chain");
      selectedChain =
        defaultChain && allChains[defaultChain] ? defaultChain : "eth";
    }

    const url = getEtherscanUrl(query, selectedChain, allChains);
    open(url);
  } catch (error) {
    showFailureToast(error, { title: "Something went wrong" });
  }
}

function determineQueryType(query: string): QueryTypes {
  if (query.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
    return "address";
  } else if (query.match(/^(0x)?[0-9a-fA-F]{64}$/)) {
    return "transaction";
  } else if (query.match(/^(0x)?[0-9a-fA-F]{1,64}$/)) {
    return "block";
  }
  throw new Error("Invalid query type");
}

function getEtherscanUrl(
  query: string,
  chain: string,
  allChains: Record<string, ChainConfig> = chains,
): string {
  const queryType = determineQueryType(query);
  const chainConfig = allChains[chain];

  if (!chainConfig) {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  const baseUrl = chainConfig.explorer_host;

  switch (queryType) {
    case "address":
      return `${baseUrl}/address/${query}`;
    case "transaction":
      return `${baseUrl}/tx/${query}`;
    case "block":
      return `${baseUrl}/block/${query}`;
    default:
      throw new Error("Unsupported query type");
  }
}
