import { closeMainWindow, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getValidatedSpaceTitle, makeNewTab } from "./cra";
import { newTabPreferences } from "./preferences";
import { normalizeURL } from "./utils";

const DEFAULT_PAGE = "cra://newtab";

export default async function command(props: LaunchProps<{ arguments: Arguments.NewTab }>) {
  const { url, space: spaceArgument } = props.arguments;
  const { fallbackText } = props;
  const newTabUrl = url || fallbackText || newTabPreferences.url || DEFAULT_PAGE;

  try {
    // Several URLs can be separated by commas. All of them are validated before anything is opened.
    const urls = newTabUrl.split(",").map((value) => normalizeURL(value));
    const space = await getValidatedSpaceTitle(spaceArgument || newTabPreferences.space);

    await closeMainWindow();
    for (const openURL of urls) {
      await makeNewTab(openURL, space);
    }
  } catch (error) {
    await showFailureToast(error, { title: "Failed opening a new tab" });
  }
}
