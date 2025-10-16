import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async () => {
  try {
    const result = await executeAction("getSolPrice", {}, true, 1000 * 60);
    return {
      status: "success",
      message: "SOL price retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving SOL price" });
    return {
      status: "error",
      message: "Error retrieving SOL price",
      error: error,
    };
  }
});
