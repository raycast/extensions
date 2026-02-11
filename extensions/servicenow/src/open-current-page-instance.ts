import { LaunchProps, LocalStorage, showToast, Toast, open } from "@raycast/api";
import { Instance } from "./types";
import { getURL } from "./utils/browserScripts";

export default async (props: LaunchProps) => {
  const { instanceName } = props.arguments;

  const item = await LocalStorage.getItem<string>("saved-instances");

  if (!item) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  let instance;
  if (instanceName) {
    const instanceProfiles = JSON.parse(item) as Instance[];
    instance = instanceProfiles.find(
      (i: Instance) =>
        i.name.toLowerCase().includes(instanceName.toLowerCase()) ||
        i.alias?.toLowerCase().includes(instanceName.toLowerCase()),
    );
  } else {
    const selectedInstance = await LocalStorage.getItem<string>("selected-instance");
    if (selectedInstance) instance = JSON.parse(selectedInstance) as Instance;
  }

  if (!instance) {
    showToast(
      Toast.Style.Failure,
      "Instance not found",
      `No instance found with name or alias containing ${instanceName}`,
    );
    return;
  }

  const url = await getURL();
  if (!url) {
    showToast(Toast.Style.Failure, "No URL found", "Please open a tab in a supported browser");
    return;
  }

  if (url.includes(".service-now.com")) {
    const urlObject = new URL(url);
    open(`https://${instance.name}.service-now.com${urlObject.pathname + urlObject.search}`);
  } else {
    showToast(Toast.Style.Failure, "The current tab is not a ServiceNow instance");
  }
};
