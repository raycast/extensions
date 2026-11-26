import { Action, Icon } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { openCushn } from "./cushn";

export function OpenCushnAction() {
  return (
    <Action
      title="Open Cushn"
      icon={Icon.AppWindow}
      onAction={() => openCushn().catch((error) => showFailureToast(error, { title: "Couldn't open Cushn" }))}
    />
  );
}
