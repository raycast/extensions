import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction, provider } from "../utils";

interface GetTokenParams {
  tokenAddress: string;
}

export default withAccessToken(provider)(async ({ tokenAddress }: GetTokenParams) => {
  try {
    // Validate input
    if (!tokenAddress || tokenAddress.trim() === "") {
      return {
        status: "error",
        message: "Token address is required",
        error: null,
      };
    }

    const result = await executeAction(
      "getToken",
      { address: tokenAddress },
      true,
      60 * 1000, // 1 minute cache
    );

    return {
      status: "success",
      message: "Token data retrieved successfully",
      result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving token data" });
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Error retrieving token data",
      error,
    };
  }
});
