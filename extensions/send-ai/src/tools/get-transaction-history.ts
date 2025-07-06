import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";
import { TransactionHistoryResponse } from "../type";

export default withAccessToken(provider)(async () => {
  try {
    const result = (await executeAction("getTransactionHistory", {}, false)) as TransactionHistoryResponse;
    return {
      status: "success",
      message: "Transaction history retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving transaction history" });
    return {
      status: "error",
      message: "Error retrieving transaction history",
      error: error,
    };
  }
});
