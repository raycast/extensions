import { BrowserExtension, LaunchProps, LocalStorage, showToast, Toast, open } from "@raycast/api";
import { Instance } from "./types";
import { getInstanceBaseUrl, isServiceNowUrl } from "./utils/instanceUrl";

export default async (props: LaunchProps) => {
  const { instanceName } = props.arguments;

  const tabs = await BrowserExtension.getTabs();
  const item = await LocalStorage.getItem<string>("saved-instances");

  if (!item) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const instanceProfiles = JSON.parse(item) as Instance[];
  const instance = instanceProfiles.find(
    (i: Instance) =>
      i.name.toLowerCase() === instanceName.toLowerCase() || i.alias?.toLowerCase() === instanceName.toLowerCase(),
  );

  if (!instance) {
    showToast(
      Toast.Style.Failure,
      "Instance not found",
      `No instance found with URL or alias containing ${instanceName}`,
    );
    return;
  }

  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab?.url && isServiceNowUrl(activeTab.url, instanceProfiles)) {
    const urlPaths = activeTab.url.split("/");
    const fullInterface = urlPaths[3] == "nav_to.do" || urlPaths[3] == "now";
    const path = decodeURIComponent(decodeURIComponent(urlPaths[urlPaths.length - 1]));
    open(`${getInstanceBaseUrl(instance)}/${fullInterface ? `nav_to.do?uri=${path}` : path}`);
  } else {
    showToast(Toast.Style.Failure, "The current tab is not a ServiceNow instance");
  }
};
