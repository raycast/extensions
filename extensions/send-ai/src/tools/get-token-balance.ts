import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ tokenAddress }: { tokenAddress: string }) => {
  try {
    const result = await executeAction(
      "getTokenBalance",
      {
        mintAddress: tokenAddress,
      },
      true,
      1000 * 60,
    );
    return {
      status: "success",
      message: "Token balance retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving token balance" });
    return {
      status: "error",
      message: "Error retrieving token balance",
      error: error,
    };
  }
});
