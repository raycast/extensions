import { moveCurrentTab, readCurrentTab } from "../util/chrome";
import { extractProfiles, loadHiddenDirectories, moveDestinations, readChromeLocalState } from "../util/profiles";
import { getSelectedBrowser } from "../util/types";
import { isValidUrl } from "../util/util";

type Input = {
  /** The destination directory ID returned by List Profiles. */
  directory: string;
  /** If the user named a URL, the active tab must match it before the move. */
  expectedUrl?: string;
};

export default async function moveTab({ directory, expectedUrl }: Input) {
  const browser = getSelectedBrowser();
  const { state } = await readChromeLocalState(browser);
  const profiles = extractProfiles(state.profile.info_cache);
  const source = await readCurrentTab(browser, profiles);
  if (!isValidUrl(source.url)) throw new Error("This tab's URL cannot be moved to another profile");
  if (
    expectedUrl !== undefined &&
    (!isValidUrl(expectedUrl) || new URL(expectedUrl).href !== new URL(source.url).href)
  ) {
    throw new Error("Select the tab with the requested URL first");
  }

  const hidden = await loadHiddenDirectories(browser);
  const destination = moveDestinations(profiles, source.profile.directory, hidden).find(
    (profile) => profile.directory === directory,
  );
  if (!destination) throw new Error("Choose a visible destination profile different from the current profile");

  await moveCurrentTab(source, destination, browser, profiles);
  return { fromProfile: source.profile.name, toProfile: destination.name };
}
