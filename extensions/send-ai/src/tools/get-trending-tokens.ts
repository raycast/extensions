import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async () => {
  try {
    const result = await executeAction("getTrendingTokens", {}, true, 1000 * 60 * 2);
    return {
      status: "success",
      message: "Trending tokens retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving trending tokens" });
    return {
      status: "error",
      message: "Error retrieving trending tokens",
      error: error,
    };
  }
});
