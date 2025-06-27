import { withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async function () {
  try {
    const result = await executeAction("getWalletAddress", {}, true, 1000 * 60 * 60 * 24);
    return {
      status: "success",
      message: "Wallet address retrieved successfully",
      result: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Error retrieving wallet address",
      error: error,
    };
  }
});
