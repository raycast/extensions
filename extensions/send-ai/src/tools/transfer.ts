import { withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ to, amount }: { to: string; amount: string }) => {
  try {
    const result = await executeAction("transfer", {
      to: to,
      amount: parseFloat(amount),
    });
    return {
      status: "success",
      message: "SOL transfer executed successfully",
      result: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Error executing SOL transfer",
      error: error,
    };
  }
});
