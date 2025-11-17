import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({
  inputAmount,
  inputMint,
}: {
  inputAmount: string;
  inputMint: string;
}) => {
  try {
    const result = await executeAction("sell", {
      inputAmount: parseFloat(inputAmount),
      inputMint: inputMint,
    });
    return {
      status: "success",
      message: "Trade executed successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error executing trade" });
    return {
      status: "error",
      message: "Error executing trade",
      error: error,
    };
  }
});
