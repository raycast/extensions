import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction, provider } from "../utils";

interface BuyTokenParams {
  outputMint: string;
  inputAmount: string;
}

export default withAccessToken(provider)(async ({ outputMint, inputAmount }: BuyTokenParams) => {
  try {
    // Validate inputs
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      return {
        status: "error",
        message: "Invalid amount: must be a positive number",
        error: null,
      };
    }

    if (!outputMint || outputMint.trim() === "") {
      return {
        status: "error",
        message: "Invalid token address: outputMint is required",
        error: null,
      };
    }

    const result = await executeAction("buy", {
      outputMint,
      inputAmount: amount.toFixed(8),
    });

    return {
      status: "success",
      message: "Trade executed successfully",
      result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error executing trade" });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Error executing trade",
      error,
    };
  }
});
