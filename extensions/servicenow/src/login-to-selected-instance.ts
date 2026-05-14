import { LocalStorage, open, showToast, Toast } from "@raycast/api";
import { Instance } from "./types";
import { getInstanceBaseUrl } from "./utils/instanceUrl";

export default async function main() {
  const instance = await LocalStorage.getItem<string>("selected-instance");
  if (!instance) {
    showToast(Toast.Style.Failure, "No instances found", "Please create an instance profile first");
    return;
  }

  const instanceProfile = JSON.parse(instance) as Instance;
  open(
    `${getInstanceBaseUrl(instanceProfile)}/login.do?user_name=${instanceProfile.username}&user_password=${instanceProfile.password}&sys_action=sysverb_login`,
  );
}
