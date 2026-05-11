import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async () => {
  try {
    const result = await executeAction("getSolBalance", {}, true, 1000 * 60);
    return {
      status: "success",
      message: "Balance retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving balance" });
    return {
      status: "error",
      message: "Error retrieving balance",
      error: error,
    };
  }
});
