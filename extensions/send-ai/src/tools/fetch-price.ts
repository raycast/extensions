import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";
import { PublicKey } from "@solana/web3.js";
import { convertUsdAmountToSol } from "../utils/convert-usd-amount-to-sol";

export default withAccessToken(provider)(async ({ tokenId }: { tokenId: string }) => {
  try {
    const result = await executeAction(
      "fetchPrice",
      {
        tokenId: new PublicKey(tokenId),
      },
      true,
      1000 * 30,
    );
    return {
      status: "success",
      message: "Token price retrieved successfully",
      result: {
        price: result.data,
        priceInSol: await convertUsdAmountToSol({ usdAmount: result.data as number }),
      },
    };
  } catch (error) {
    showFailureToast(error, { title: "Error retrieving token price" });
    return {
      status: "error",
      message: "Error retrieving token price",
      error: error,
    };
  }
});
