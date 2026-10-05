import { open, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getInstanceBaseUrl } from "./utils/instanceUrl";
import { resolveInstanceOrToast } from "./utils/instanceResolver";

export default async (props: LaunchProps) => {
  try {
    const resolved = await resolveInstanceOrToast(props.arguments.instanceName);
    if (!resolved) return;
    await open(getInstanceBaseUrl(resolved.instance));
  } catch (error) {
    showFailureToast(error);
  }
};
