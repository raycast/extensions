import { LaunchProps, LocalStorage, open, showToast, Toast } from "@raycast/api";
import { Instance } from "./types";
import { showFailureToast } from "@raycast/utils";
import { getInstanceBaseUrl } from "./utils/instanceUrl";

export default async (props: LaunchProps) => {
  const { instanceName } = props.arguments;

  const item = await LocalStorage.getItem<string>("saved-instances");

  if (!item) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  let instance;
  if (instanceName) {
    let instanceProfiles;
    try {
      instanceProfiles = JSON.parse(item) as Instance[];
    } catch (error) {
      showFailureToast(error, { title: "Could not parse saved instances" });
      return;
    }
    instance = instanceProfiles.find(
      (i: Instance) =>
        i.name.toLowerCase().includes(instanceName.toLowerCase()) ||
        i.alias?.toLowerCase().includes(instanceName.toLowerCase()),
    );
  } else {
    const selectedInstance = await LocalStorage.getItem<string>("selected-instance");
    if (selectedInstance) {
      try {
        instance = JSON.parse(selectedInstance) as Instance;
      } catch (error) {
        showFailureToast(error, { title: "Could not parse selected instance" });
        return;
      }
    }
  }

  if (!instance) {
    showToast(
      Toast.Style.Failure,
      "Instance not found",
      `No instance found with URL or alias containing ${instanceName}`,
    );
    return;
  }

  open(
    `${getInstanceBaseUrl(instance)}/login.do?user_name=${instance.username}&user_password=${instance.password}&sys_action=sysverb_login`,
  );
};
