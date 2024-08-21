import { Action, Application, getApplications, Image, open } from "@raycast/api";

/**
 * The bundle ID for the Google Chrome browser.
 */
const CHROME_BUNDLE_ID = "com.google.Chrome";

/**
 * The bundle ID for the Microsoft Edge browser.
 */
const EDGE_BUNDLE_ID = "com.microsoft.Edge";

/**
 * A set of bundle IDs for the browsers that are compatible with gameplay on Luna.
 */
const LUNA_COMPATIBLE_BUNDLES = new Set([CHROME_BUNDLE_ID, EDGE_BUNDLE_ID]);

/**
 * Defines the shape of the props for the OpenUrlAction component.
 */
interface Props {
  /**
   * The icon to display for the action.
   */
  icon: Image.ImageLike | undefined | null;

  /**
   * The title to display for the action.
   */
  title: string;

  /**
   * The URL to open when the action is triggered.
   */
  url: string;
}

/**
 * Determines the target browser application that is compatible with the Luna platform.
 *
 * @returns A Promise that resolves to the target browser application, or `undefined` if no compatible browser is found.
 */
const targetBrowser = (async (): Promise<Application | undefined> => {
  const installedApplications = await getApplications();
  const target = installedApplications.find((app) =>
    app.bundleId ? LUNA_COMPATIBLE_BUNDLES.has(app.bundleId) : false
  );
  return target;
})();

/**
 * Opens the specified URL in the target browser application.
 *
 * @param url The URL to open.
 * @returns A Promise that resolves when the URL has been opened.
 */
async function openUrl(url: string): Promise<void> {
  const browser = await targetBrowser;
  await open(url, browser);
}

/**
 * A React component that renders an Action with the provided props.
 * When the action is triggered, it opens the specified URL in the target browser application.
 *
 * @param props The props for the component, including an optional icon, a title, and a URL to open.
 * @returns A JSX.Element representing the OpenUrlAction component.
 */
export function OpenUrlAction({ icon, title, url }: Props): JSX.Element {
  return <Action title={title} icon={icon} onAction={async () => await openUrl(url)} />;
}
