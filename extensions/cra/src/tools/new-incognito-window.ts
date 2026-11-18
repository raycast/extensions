import { Tool } from "@raycast/api";
import { makeNewWindow } from "../cra";
import { config } from "../new-incognito-window";
import { NewTabSearchConfigs } from "../types";
import { isURL, normalizeURL } from "../utils";
import { NewIncognitoWindowPreferences } from "../preferences";

type Input = {
  /**
   * The URL or search query to open in the new incognito window.
   *
   * @remarks
   * If no URL is provided, the default page will be opened.
   */
  url?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { message: `Open a new incognito window${input.url ? ` with "${input.url}"` : ""}?` };
};

const tool = async ({ url }: Input) => {
  if (url) {
    if (!isURL(url)) {
      url = `${config[NewIncognitoWindowPreferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(url)}`;
    }
  } else {
    url = NewIncognitoWindowPreferences.url;
  }

  await makeNewWindow({ incognito: true, url: url ? normalizeURL(url) : undefined });
};

export default tool;
