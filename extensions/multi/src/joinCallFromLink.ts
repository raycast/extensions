import { LaunchProps, PopToRootType, closeMainWindow } from "@raycast/api";
import { joinCallFromLink } from "./lib/multi";
import { showMultiScriptErrorToast } from "./lib/showMultiScriptErrorToast";

export default async (props: LaunchProps) => {
  closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });

  try {
    await joinCallFromLink(props.arguments.url);
  } catch (error) {
    showMultiScriptErrorToast(error);
  }
};
