import { showFailureToast, withAccessToken } from "@raycast/utils";
import { provider } from "../utils/auth";
import { getPriceHistory } from "../utils/getPriceHistory";

export default withAccessToken(provider)(async ({ tokenId }: { tokenId: string }) => {
  try {
    const result = await getPriceHistory({
      address: tokenId,
      timeFrom: Math.floor(new Date(Date.now() - 1000 * 60 * 60 * 24).getTime() / 1000),
      timeTo: Math.floor(new Date().getTime() / 1000),
      timeInterval: "1H",
    });
    return {
      status: "success",
      message: "Token price history retrieved successfully",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving token price history" });
    return {
      status: "error",
      message: "Error retrieving token price",
      error: error,
    };
  }
});
