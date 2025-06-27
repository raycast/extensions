import { withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async () => {
  try {
    const result = await executeAction("luloGetApy");
    return {
      status: "success",
      message: "Lulo APY retrieved successfully",
      result: result,
    };
  } catch (error) {
    return {
      status: "error",
      message: "Error retrieving Lulo APY",
      error: error,
    };
  }
});
