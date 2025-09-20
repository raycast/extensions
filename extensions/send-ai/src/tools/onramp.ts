import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ amount }: { amount?: number }) => {
  try {
    const params: Record<string, number> = {};
    if (amount) params.amount = amount;

    const result = await executeAction("onramp", params);
    return {
      status: "success",
      message: "Onramp URL generated successfully",
      result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error generating onramp URL" });
    return {
      status: "error",
      message: "Error generating onramp URL",
      error: error,
    };
  }
});
