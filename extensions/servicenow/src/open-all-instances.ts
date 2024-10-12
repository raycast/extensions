import { open, LocalStorage, showToast, Toast } from "@raycast/api";
import { uniqBy } from "lodash";

export default async () => {
  const item = await LocalStorage.getItem<string>("saved-instances");
  if (!item){
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const instanceProfiles = JSON.parse(item);
  const instances = uniqBy(instanceProfiles, "name");
  instances.forEach((i:any) => open(`https://${i.name}.service-now.com`));
};

