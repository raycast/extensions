import { getValidatedSpaceTitle, makeNewTab } from "../arc";
import { newTabPreferences } from "../preferences";
import { validateURL } from "../utils";

type Input = {
  /**
   * The URL to open in the new tab.
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

const DEFAULT_PAGE = "arc://newtab";

const handleOpenNewTab = async (newTabUrl: string, space?: string) => {
  if (await validateURL(newTabUrl)) {
    // Append https:// if protocol is missing
    const openURL = !/^\S+?:\/\//i.test(newTabUrl) ? "https://" + newTabUrl : newTabUrl;
    await makeNewTab(openURL, space);
  }
};

const tool = async (input: Input) => {
  const url = input.url;
  const newTabUrl = url || newTabPreferences.url || DEFAULT_PAGE;

  const space = await getValidatedSpaceTitle(input.spaceId);

  if (newTabUrl.includes(",")) {
    const multileTabs = newTabUrl.split(",").map((url: string) => handleOpenNewTab(url.trim(), space));

    return Promise.all(multileTabs);
  } else {
    return await handleOpenNewTab(newTabUrl, space);
  }
};

export default tool;
