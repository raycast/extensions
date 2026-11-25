import { Tool } from "@raycast/api";
import { getValidatedSpaceTitle, makeNewTab } from "../cra";
import { newTabPreferences } from "../preferences";
import { normalizeURL } from "../utils";

type Input = {
  /**
   * The URL to open in the new tab. Several URLs can be separated by commas.
   *
   * @remarks
   * If no URL is provided, the default page will be opened.
   */
  url?: string;
  /**
   * The space ID to open the new tab in.
   *
   * @remarks
   * Use `get-spaces` to get the Id of a space. If space is not specified, omit it.
   */
  spaceId?: string;
};

const DEFAULT_PAGE = "cra://newtab";

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { message: `Open ${input.url || newTabPreferences.url || DEFAULT_PAGE} in a new tab?` };
};

const tool = async (input: Input) => {
  const newTabUrl = input.url || newTabPreferences.url || DEFAULT_PAGE;
  // Validate everything first, so nothing is opened when one of the URLs is invalid.
  const urls = newTabUrl.split(",").map((url) => normalizeURL(url));
  const space = await getValidatedSpaceTitle(input.spaceId);

  for (const url of urls) {
    await makeNewTab(url, space);
  }
};

export default tool;
