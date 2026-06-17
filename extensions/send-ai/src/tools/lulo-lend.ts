import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ amount }: { amount: number }) => {
  try {
    const result = await executeAction("luloLend", {
      amount: amount,
    });
    return {
      status: "success",
      message: "Lending executed successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error executing lending" });
    return {
      status: "error",
      message: "Error executing lending",
      error: error,
    };
  }
});
