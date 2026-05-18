import { open, LocalStorage, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { uniqBy } from "lodash";
import { Instance } from "./types";
import { getInstanceBaseUrl } from "./utils/instanceUrl";

export default async () => {
  try {
    const item = await LocalStorage.getItem<string>("saved-instances");
    if (!item) {
      showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
      return;
    }

    const instanceProfiles = JSON.parse(item) as Instance[];
    const instances = uniqBy(instanceProfiles, "name");
    instances.forEach((i: Instance) => open(getInstanceBaseUrl(i)));
  } catch (error) {
    showFailureToast(error);
  }
};
