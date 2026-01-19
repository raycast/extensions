import { Tool } from "@raycast/api";
import { resend } from "../lib/resend";

type Input = {
  /**
   * The ID of the API key to remove.
   * This is required to identify which API key to delete.
   * You can get this ID by using the list-api-keys tool first.
   */
  apiKeyId: string;
  /**
   * The name of the API key to remove.
   * This is required to identify which API key to delete.
   * You can get this name by using the list-api-keys tool first.
   */
  apiKeyName: string;
};

const tool = async (input: Input) => {
  const { data, error } = await resend.apiKeys.remove(input.apiKeyId);

  if (error) {
    throw new Error(`Failed to remove API key: ${error.message}`);
  }

  return data;
};

export const confirmation: Tool.Confirmation<Input> = async (input: Input) => {
  return {
    title: "Remove API Key",
    message: "Are you sure you want to remove this API key? This action cannot be undone.",
    info: [
      {
        name: "API Key Name",
        value: input.apiKeyName,
      },
      {
        name: "API Key ID",
        value: input.apiKeyId,
      },
    ],
  };
};

export default tool;
