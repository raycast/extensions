import { executeAction } from "./api-wrapper";

interface ConvertUsdAmountToSolParams {
  usdAmount: number;
}

export const convertUsdAmountToSol = async ({ usdAmount }: ConvertUsdAmountToSolParams) => {
  try {
    const result = await executeAction<number>("getSolPrice");
    const solPrice = result.data;
    if (!solPrice) {
      throw new Error("SOL price is not available");
    }
    const solAmount = usdAmount / solPrice;
    return solAmount;
  } catch (error) {
    console.error(error);
    throw new Error("Error retrieving SOL price");
  }
};
