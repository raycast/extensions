import { Resend } from "resend";
import { API_KEY } from "../utils/constants";
import "cross-fetch/polyfill";

const resend = new Resend(API_KEY);

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
