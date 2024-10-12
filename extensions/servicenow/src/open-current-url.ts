import { BrowserExtension, LaunchProps, LocalStorage, showToast, Toast, open } from "@raycast/api";


export default async (props: LaunchProps) => {
  const { instanceName } = props.arguments;

  const tabs = await BrowserExtension.getTabs();
  const item = await LocalStorage.getItem<string>("saved-instances");

  if (!item) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const instanceProfiles = JSON.parse(item);
  const instance = instanceProfiles.find(
    (i:any) => i.name.toLowerCase() === instanceName.toLowerCase() || i.alias.toLowerCase() === instanceName.toLowerCase()
  );

  if (!instance) {
    showToast(Toast.Style.Failure, "Instance not found", `No instance found with name or alias: ${instanceName}`);
    return;
  }

  const activeTab = tabs.find((tab) => tab.active);

  if (activeTab && activeTab.url?.includes(".service-now.com")) {
    const path = activeTab.url.split("/")[3];
    open(`https://${instance.name}.service-now.com/${path}`);
  }
  else{
    showToast(Toast.Style.Failure, "The current tab is not a ServiceNow instance");
  }
};

