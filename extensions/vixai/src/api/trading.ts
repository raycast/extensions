import API from "./base";

export const SolMint = "So11111111111111111111111111111111111111112";

export type SwapParams = {
  input_mint: string;
  output_mint: string;
  swap_mode: "ExactIn" | "ExactOut";
  amount: number;
};

export type SwapResponse = {
  tx_signature: string;
};

export default class TradingAPI {
  static async swap(params: SwapParams): Promise<SwapResponse> {
    return API.post<SwapResponse>("/trading/swap", params);
  }
}
