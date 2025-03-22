import { open, LocalStorage, showToast, Toast } from "@raycast/api";
import { uniqBy } from "lodash";
import { Instance } from "./types";

export default async () => {
  const item = await LocalStorage.getItem<string>("saved-instances");
  if (!item) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const instanceProfiles = JSON.parse(item) as Instance[];
  const instances = uniqBy(instanceProfiles, "name");
  instances.forEach((i: Instance) => open(`https://${i.name}.service-now.com`));
};
