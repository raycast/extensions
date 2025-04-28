import { open, LocalStorage, showToast, Toast, LaunchProps } from "@raycast/api";
import { Instance } from "./types";

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

  open(`https://${instance.name}.service-now.com`);
};
