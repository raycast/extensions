import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async function () {
  try {
    const result = await executeAction("getSolBalance", {}, false);
    return {
      status: "success",
      message: "SOL balance retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving SOL balance" });
    return {
      status: "error",
      message: "Error retrieving SOL balance",
      error: error,
    };
  }
});
