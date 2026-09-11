import { LaunchProps, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getURL } from "./utils/browserScripts";
import { getInstanceBaseUrl, isServiceNowUrl } from "./utils/instanceUrl";
import { resolveInstanceOrToast } from "./utils/instanceResolver";

export default async (props: LaunchProps) => {
  try {
    const resolved = await resolveInstanceOrToast(props.arguments.instanceName);
    if (!resolved) return;
    const { instance, instances } = resolved;

    const url = await getURL();
    if (!url) {
      showToast({
        style: Toast.Style.Failure,
        title: "No URL found",
        message: "Please open a tab in a supported browser",
      });
      return;
    }

    if (isServiceNowUrl(url, instances)) {
      const urlObject = new URL(url);
      open(`${getInstanceBaseUrl(instance)}${urlObject.pathname + urlObject.search}`);
    } else {
      showToast({ style: Toast.Style.Failure, title: "The current tab is not a ServiceNow instance" });
    }
  } catch (error) {
    showFailureToast(error);
  }
};
