import { getPreferenceValues, Tool } from "@raycast/api";
import { makeNewLittleWindow } from "../cra";
import { config } from "../new-incognito-window";
import { NewTabSearchConfigs } from "../types";
import { isURL, normalizeURL } from "../utils";

type Input = {
  /**
   * The URL or search query to open in a new Little Window.
   *
   * @remarks
   * If no URL is provided, the default page from the command preferences is opened.
   */
  url?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return { message: `Open ${input.url || "the default page"} in a new Little Window?` };
};

const tool = async ({ url }: Input) => {
  const preferences = getPreferenceValues<Preferences.NewLittleWindow>();
  let target = url;

  if (target) {
    target = isURL(target)
      ? target
      : `${config[preferences.engine as keyof NewTabSearchConfigs]}${encodeURIComponent(target)}`;
  } else {
    target = preferences.url;
  }

  await makeNewLittleWindow(normalizeURL(target));
};

export default tool;
