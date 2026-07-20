import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface EtherscanResponse {
  jsonrpc: string;
  id: number;
  result: string;
}

interface UseGasPriceOptions {
  includeUnit?: boolean;
}

export function useGasPrice({ includeUnit = true }: UseGasPriceOptions = {}) {
  const { apiKey } = getPreferenceValues<Preferences>();

  return useFetch(`https://api.etherscan.io/v2/api?chainid=8453&module=proxy&action=eth_gasPrice&apikey=${apiKey}`, {
    parseResponse: async (response) => {
      const data = (await response.json()) as EtherscanResponse;

      if (!data.result) {
        throw new Error("Invalid response");
      }

      const priceInWei = Number.parseInt(data.result.substring(2), 16);
      const finalPrice = priceInWei / 1e6;

      return finalPrice;
    },
    mapResult: (price) => {
      const formattedPrice = price.toFixed(0);
      return {
        data: includeUnit ? `${formattedPrice} MWei` : formattedPrice,
      };
    },
  });
}
