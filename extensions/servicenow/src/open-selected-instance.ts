import { open, LocalStorage, showToast, Toast } from "@raycast/api";

export default async () => {
  const instanceName = await LocalStorage.getItem<string>("selected-instance");
  if (!instanceName){
    showToast(Toast.Style.Failure, "Instance not found", "Please create an instance profile first");
    return;
  }

  open(`https://${instanceName}.service-now.com`);
};

