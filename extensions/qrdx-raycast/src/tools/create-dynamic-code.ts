import { writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Tool } from "@raycast/api";
import { requireApiKey } from "../api-key";
import { dynamicCodeRenderProps } from "../code-style";
import { buildPNGBuffer, withLogoData } from "../qr-engine";
import { createCode, dashboardLink, destinationError } from "../qrdx-api";

interface Input {
  /** The web address (https://…) the code should open. It can be changed later without reprinting the code. */
  destinationUrl: string;
  /** Optional short title for the code, such as "Spring menu". */
  title?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Create this dynamic QR code in your QRdx workspace?",
  info: [
    { name: "Destination", value: input.destinationUrl },
    ...(input.title ? [{ name: "Title", value: input.title }] : []),
  ],
});

/**
 * Create a dynamic QR code in the user's QRdx workspace: a short link that
 * opens the destination, can be pointed somewhere else later and counts its
 * scans. It gets the workspace's default design. Saves the code's PNG to
 * ~/Downloads and returns its short link and id.
 */
export default async function createDynamicCode(input: Input): Promise<string> {
  const problem = destinationError(input.destinationUrl);
  if (problem) return `${problem}. Ask the user for the full web address the code should open.`;
  const code = await createCode(requireApiKey(), input);
  const filename = `qrdx-${code.slug.replace(/[^\w-]/g, "")}-${Date.now()}.png`;
  const saved = await withLogoData(dynamicCodeRenderProps(code))
    .then((props) => {
      writeFileSync(join(homedir(), "Downloads", filename), buildPNGBuffer(props));
      return `Its PNG is saved to ~/Downloads/${filename}.`;
    })
    .catch((error: unknown) => `Its PNG couldn't be saved: ${error instanceof Error ? error.message : String(error)}`);
  return `Created the dynamic QR code ${code.shortLink} (id ${code.id}), which opens ${code.destinationUrl}. ${saved} Manage it in QRdx: ${dashboardLink(code.id)}`;
}
