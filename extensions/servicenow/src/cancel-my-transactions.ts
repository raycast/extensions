import { open, LaunchProps } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { buildServiceNowUrl } from "./utils/buildServiceNowUrl";
import { resolveInstanceOrToast } from "./utils/instanceResolver";

export default async (props: LaunchProps) => {
  try {
    const resolved = await resolveInstanceOrToast(props.arguments.instanceName);
    if (!resolved) return;
    await open(buildServiceNowUrl(resolved.instance.name, "cancel_my_transaction.do"));
  } catch (error) {
    showFailureToast(error);
  }
};
