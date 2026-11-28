import type { Tool } from "@raycast/api";
import { requireApiKey } from "../api-key";
import { codeName, destinationError, getCode, updateCode } from "../qrdx-api";

interface Input {
  /** The code's id, from list-dynamic-codes. */
  codeId: string;
  /** The new web address (https://…) the code should open. */
  destinationUrl: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const code = await getCode(requireApiKey(), input.codeId);
  return {
    message: `Point ${codeName(code)} somewhere else? Everyone who scans it, printed copies included, gets the new address.`,
    info: [
      { name: "Short link", value: code.shortLink },
      { name: "Opens now", value: code.destinationUrl ?? "A hosted page" },
      { name: "Will open", value: input.destinationUrl },
    ],
  };
};

/**
 * Change where a dynamic QR code in the user's QRdx workspace sends people.
 * The code and its short link stay the same, so printed copies keep working.
 * Find the code's id with list-dynamic-codes first.
 */
export default async function updateDestination(input: Input): Promise<string> {
  const problem = destinationError(input.destinationUrl);
  if (problem) return `${problem}. Ask the user for the full web address the code should open.`;
  const code = await updateCode(requireApiKey(), input.codeId, { destinationUrl: input.destinationUrl.trim() });
  return `${codeName(code)} (${code.shortLink}) now opens ${code.destinationUrl}.`;
}
