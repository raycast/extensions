import { executeAction } from "../utils/api-wrapper";
import { withAccessToken } from "@raycast/utils";
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
    console.error(error);
    return {
      status: "error",
      message: "Error generating bridge URL",
      error: error,
    };
  }
});
