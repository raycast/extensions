import {
  closeMainWindow,
  confirmAlert,
  getApplications,
  getFrontmostApplication,
  Icon,
  open,
  showToast,
  Toast,
} from "@raycast/api";
import { getTabCount, refreshBrowser } from "./utils/applescript-utils";
import {
  EXTENSION_README,
  NEED_ALLOW_JAVA_SCRIPT,
  NEED_ALLOW_JAVA_SCRIPT_TIP,
  NEED_ALLOW_JAVA_SCRIPT_TIP_MESSAGE,
  TEST_URL,
} from "./utils/constants";

export default async () => {
  await closeMainWindow();
  const frontmostApp = await getFrontmostApplication();
  const browsers = await getApplications(TEST_URL);
  const isFrontmostBrowser = browsers.find((browser) => browser.bundleId === frontmostApp.bundleId);
  if (isFrontmostBrowser) {
    const tabCount = await getTabCount(frontmostApp.name);
    const tabTips = tabCount === 0 ? "" : `${tabCount} ${tabCount === 1 ? "tab" : "tabs"} in `;
    await showToast({ title: `Refreshing ${tabTips}${frontmostApp.name}`, style: Toast.Style.Animated });
    const retRefreshBrowser = await refreshBrowser(frontmostApp.name);
    if (retRefreshBrowser) {
      await showToast({
        title: `Failed to refresh ${tabTips}${frontmostApp.name}`,
        message: retRefreshBrowser,
        style: Toast.Style.Failure,
      });
      if (retRefreshBrowser.includes(NEED_ALLOW_JAVA_SCRIPT)) {
        await confirmAlert({
          icon: Icon.Terminal,
          title: NEED_ALLOW_JAVA_SCRIPT_TIP,
          message: NEED_ALLOW_JAVA_SCRIPT_TIP_MESSAGE,
          primaryAction: {
            title: "How to Setup",
            onAction: async () => {
              await open(EXTENSION_README);
            },
          },
        });
      }
    } else {
      await showToast({ title: `Refreshed ${tabTips}${frontmostApp.name}`, style: Toast.Style.Success });
    }
  } else {
    await showToast({ title: `The frontmost app is ${frontmostApp.name}`, style: Toast.Style.Failure });
  }
};
