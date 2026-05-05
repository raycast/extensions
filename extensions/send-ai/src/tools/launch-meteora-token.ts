import { showFailureToast, withAccessToken } from "@raycast/utils";
import { executeAction } from "../utils/api-wrapper";
import { provider } from "../utils/auth";
import { Tool } from "@raycast/api";

export const confirmation: Tool.Confirmation<{
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
}> = async (input) => {
  if (!input.name || !input.symbol || !input.description || !input.imageUrl) {
    return {
      message: "Please provide the name, symbol, description and image url of the token",
    };
  }
  return {
    message: `Are you sure you want to launch ${input.name}?`,
  };
};

export default withAccessToken(provider)(async ({
  name,
  symbol,
  description,
  imageUrl,
}: {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
}) => {
  try {
    const params: Record<string, string | number> = {
      name: name,
      symbol: symbol,
      description: description,
      imageUrl: imageUrl,
    };

    const result = await executeAction("launchMeteoraToken", params);
    return {
      status: "success",
      message: "Token launched successfully on Meteora",
      result: result,
    };
  } catch (error) {
    showFailureToast(error, { title: "Error launching Meteora token" });
    return {
      status: "error",
      message: "Error launching Meteora token",
      error: error,
    };
  }
});
