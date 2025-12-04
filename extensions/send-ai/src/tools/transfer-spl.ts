import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ to, amount, mint }: { to: string; amount: string; mint: string }) => {
  try {
    const result = await executeAction("transferSPL", {
      to: to,
      mint: mint,
      amount: parseFloat(amount),
    });
    return {
      status: "success",
      message: "SPL transfer executed successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error executing SPL transfer" });
    return {
      status: "error",
      message: "Error executing SPL transfer",
      error: error,
    };
  }
});
