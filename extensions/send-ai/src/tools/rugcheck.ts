import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({ mint }: { mint: string }) => {
  try {
    const result = await executeAction("rugcheck", {
      mint: mint,
    });
    return {
      status: "success",
      message: "Rug check completed successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error performing rug check" });
    return {
      status: "error",
      message: "Error performing rug check",
      error: error,
    };
  }
});
