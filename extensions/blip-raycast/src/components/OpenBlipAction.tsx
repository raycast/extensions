import { Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openBlip } from "../lib/endpoint";

export function OpenBlipAction() {
  return (
    <Action
      title="Open Blip"
      icon={Icon.AppWindow}
      onAction={() => openBlip().catch((error) => showFailureToast(error, { title: "Couldn't Open Blip" }))}
    />
  );
}
