import {  LocalStorage, launchCommand, LaunchType, LaunchProps, showToast, Toast } from "@raycast/api";

export default async (props: LaunchProps) => {
    const { instanceName, query } = props.arguments;

    const item = await LocalStorage.getItem<string>("saved-instances");
    if (!item){
        showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
        return;
      }

    const instanceProfiles = JSON.parse(item);
    const instanceProfile = instanceProfiles.find((i:any) => i.name.toLowerCase() === instanceName.toLowerCase() || i.alias.toLowerCase() === instanceName.toLowerCase());
    if(!instanceProfile){
      showToast(Toast.Style.Failure, "Instance not found", `No instance found with name or alias: ${instanceName}`);
      return;
    }
    LocalStorage.setItem("selected-instance", instanceProfile.name);

  await launchCommand({ name: "quickly-search-selected-instance", type: LaunchType.UserInitiated, arguments: { query }, context: {instanceName} });
};

