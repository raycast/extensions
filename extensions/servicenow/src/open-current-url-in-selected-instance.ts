import { BrowserExtension, LocalStorage, showToast, Toast, open } from "@raycast/api";
import { Instance } from "./types";
import { getInstanceBaseUrl, isServiceNowUrl } from "./utils/instanceUrl";

export default async () => {
  const tabs = await BrowserExtension.getTabs();
  const instance = await LocalStorage.getItem<string>("selected-instance");
  const saved = await LocalStorage.getItem<string>("saved-instances");

  if (!instance) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const instanceProfile = JSON.parse(instance) as Instance;
  const instanceProfiles = saved ? (JSON.parse(saved) as Instance[]) : [instanceProfile];
  const activeTab = tabs.find((tab) => tab.active);
  if (activeTab?.url && isServiceNowUrl(activeTab.url, instanceProfiles)) {
    const path = activeTab.url.split("/")[3];
    open(`${getInstanceBaseUrl(instanceProfile)}/${path}`);
  } else {
    showToast(Toast.Style.Failure, "The current tab is not a ServiceNow instance");
  }
};
