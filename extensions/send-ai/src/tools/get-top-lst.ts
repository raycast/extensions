import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async () => {
  try {
    const result = await executeAction("getTopLST");
    return {
      status: "success",
      message: "Top LST tokens retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving top LST tokens" });
    return {
      status: "error",
      message: "Error retrieving top LST tokens",
      error: error,
    };
  }
});
