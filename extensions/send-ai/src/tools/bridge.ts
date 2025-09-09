import { executeAction } from "../utils/api-wrapper";
import { showFailureToast, withAccessToken } from "@raycast/utils";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ amount }: { amount: string }) => {
  try {
    const result = await executeAction("bridge", {
      amount: parseFloat(amount),
    });
    return {
      status: "success",
      message: "Bridge URL generated successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error generating bridge URL" });
    return {
      status: "error",
      message: "Error generating bridge URL",
      error: error,
    };
  }
});
