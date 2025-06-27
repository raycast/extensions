import { withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ ticker }: { ticker: string }) => {
  try {
    const result = await executeAction(
      "getTokenDataByTicker",
      {
        ticker: ticker,
      },
      true,
      1000 * 60,
    );
    return {
      status: "success",
      message: "Token data retrieved successfully",
      result: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Error retrieving token data",
      error: error,
    };
  }
});
