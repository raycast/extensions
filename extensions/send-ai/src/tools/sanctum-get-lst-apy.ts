import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ inputs }: { inputs: string[] }) => {
  try {
    const result = await executeAction("sanctumGetLSTAPY", {
      inputs: inputs,
    });
    return {
      status: "success",
      message: "Sanctum LST APY retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving Sanctum LST APY" });
    return {
      status: "error",
      message: "Error retrieving Sanctum LST APY",
      error: error,
    };
  }
});
