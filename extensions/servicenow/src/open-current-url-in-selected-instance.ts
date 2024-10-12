import { BrowserExtension,  LocalStorage, showToast, Toast, open } from "@raycast/api";

export default async () => {
  const tabs = await BrowserExtension.getTabs();
  const instanceName = await LocalStorage.getItem<string>("selected-instance");

  if (!instanceName) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab && activeTab.url?.includes(".service-now.com")) {
    const path = activeTab.url.split("/")[3];
    open(`https://${instanceName}.service-now.com/${path}`);
  }
  else{
    showToast(Toast.Style.Failure, "The current tab is not a ServiceNow instance");
  }
};
