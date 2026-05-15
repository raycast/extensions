import { LaunchProps, LocalStorage, showToast, Toast, open } from "@raycast/api";
import { Instance } from "./types";
import { findSysID } from "./utils/snSnippets";
import { getInstanceBaseUrl } from "./utils/instanceUrl";
import { ServiceNowClient } from "./utils/serviceNowClient";

export default async (props: LaunchProps) => {
  const { sys_id, instanceName } = props.arguments;
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
      `No instance found with URL or alias containing ${instanceName}`,
    );
    return;
  }

  const instanceLabel = instance.alias || instance.name;

  showToast(Toast.Style.Animated, `Searching Sys ID in ${instanceLabel}...`);

  const client = new ServiceNowClient(instance);
  const isAuthenticated = await client.init();

  if (!isAuthenticated) {
    return;
  }

  const callBack = (response: string) => {
    const answer = response.match(/###(.*)###/);
    if (response.length === 0)
      showToast(Toast.Style.Failure, "Could not search for Sys ID", "Admin access is required.");
    else if (answer != null && answer[1]) {
      const table = answer[1].split("^")[0];
      const path = table + ".do?sys_id=" + sys_id;
      open(`${getInstanceBaseUrl(instance)}/${path}`);
    } else {
      showToast(Toast.Style.Failure, `Sys ID not found on ${instance.alias}.`);
    }
  };

  await client.startBackgroundScript(findSysID(sys_id), callBack);
};
