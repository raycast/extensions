import { withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";

export default withAccessToken(provider)(async ({
  name,
  symbol,
  description,
  imageUrl,
  amount,
  twitter,
  telegram,
  website,
}: {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  amount: number;
  twitter?: string;
  telegram?: string;
  website?: string;
}) => {
  try {
    const params: Record<string, string | number> = {
      name: name,
      symbol: symbol,
      description: description,
      imageUrl: imageUrl,
      amount: amount,
    };

    if (twitter) params.twitter = twitter;
    if (telegram) params.telegram = telegram;
    if (website) params.website = website;

    const result = await executeAction("launchPumpFunToken", params);
    return {
      status: "success",
      message: "Pump.fun token launched successfully",
      result: result,
    };
  } catch (error) {
    console.error(error);
    return {
      status: "error",
      message: "Error launching Pump.fun token",
      error: error,
    };
  }
});
