import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { uniqBy } from "lodash";
import { Instance } from "./types";
import { getInstanceBaseUrl } from "./utils/instanceUrl";
import { loadInstancesOrToast } from "./utils/instanceResolver";

export default async () => {
  try {
    const instanceProfiles = await loadInstancesOrToast();
    if (!instanceProfiles) return;
    const instances = uniqBy(instanceProfiles, "name");
    instances.forEach((i: Instance) => open(getInstanceBaseUrl(i)));
  } catch (error) {
    showFailureToast(error);
  }
};
