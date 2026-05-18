import { LaunchProps, LocalStorage, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { Instance } from "./types";
import { getURL } from "./utils/browserScripts";
import { getInstanceBaseUrl, isServiceNowUrl } from "./utils/instanceUrl";

export default async (props: LaunchProps) => {
  try {
    const { instanceName } = props.arguments;

    const item = await LocalStorage.getItem<string>("saved-instances");

    if (!item) {
      showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
      return;
    }

    const instanceProfiles = JSON.parse(item) as Instance[];
    let instance;
    if (instanceName) {
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
      if (instanceName) {
        showToast(
          Toast.Style.Failure,
          "Instance not found",
          `No instance found with URL or alias containing "${instanceName}"`,
        );
      } else {
        showToast(
          Toast.Style.Failure,
          "No instance selected",
          "Pass an instance name as argument or select one in Manage Instance Profiles",
        );
      }
      return;
    }

    const url = await getURL();
    if (!url) {
      showToast(Toast.Style.Failure, "No URL found", "Please open a tab in a supported browser");
      return;
    }

    if (isServiceNowUrl(url, instanceProfiles)) {
      const urlObject = new URL(url);
      open(`${getInstanceBaseUrl(instance)}${urlObject.pathname + urlObject.search}`);
    } else {
      showToast(Toast.Style.Failure, "The current tab is not a ServiceNow instance");
    }
  } catch (error) {
    showFailureToast(error);
  }
};
