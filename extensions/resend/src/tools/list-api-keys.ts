import { resend } from "../lib/resend";

/**
 * Tool to list all API keys from Resend
 * Returns the list of API keys with their details
 */
const tool = async () => {
  const { data, error } = await resend.apiKeys.list();

  if (error) {
    throw new Error(`Failed to list API keys: ${error.message}`);
  }

  return data;
};

export default tool;
