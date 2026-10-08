import { Alert, confirmAlert, Icon } from "@raycast/api";
import { captureRaycastMetadata, captureResultToast, getRaycastLocation, getRaycastSize } from "./utils/common-utils";
import { RAYCAST_WINDOW_HEIGHT, RAYCAST_WINDOW_WIDTH } from "./utils/constants";

export default async () => {
  const _raycastLocation = await getRaycastLocation();
  const _raycastSize = await getRaycastSize();
  const optionsAlert: Alert.Options = {
    icon: Icon.RaycastLogoPos,
    title: "Captured Failed",
    message: "",
  };

  if (_raycastLocation[0] === -1) {
    optionsAlert.message = "Raycast main window not found!";
    await confirmAlert(optionsAlert);
    return;
  } else {
    if (_raycastSize[1] / _raycastSize[0] != RAYCAST_WINDOW_HEIGHT / RAYCAST_WINDOW_WIDTH) {
      optionsAlert.message = "Please close other Raycast windows and open Raycast main window only!";
      await confirmAlert(optionsAlert);
    } else {
      const captureResult = await captureRaycastMetadata(
        { x: _raycastLocation[0], y: _raycastLocation[1] },
        { w: _raycastSize[0], h: _raycastSize[1] },
      );
      await new Promise((r) => setTimeout(r, 300));
      await captureResultToast(captureResult);
    }
  }
};
