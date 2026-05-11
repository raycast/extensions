import { confirmAlert, showToast, Toast } from "@raycast/api";
import { ConnectedDrive, RemoteServices } from "bmw-connected-drive";
import { getCommandDetails } from "./getCommandsdDetail";

export async function executeCommand(command: RemoteServices, api: ConnectedDrive | null, VIN: string) {
  if (!api) {
    return;
  }

  const { command: commandType, commandName, loadingMessage } = getCommandDetails(command);

  if (
    await confirmAlert({
      title: `Are you sure you want to ${commandName}?`,
      message: "Remote functions may take a few seconds",
    })
  ) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: loadingMessage,
    });

    try {
      let result;
      switch (commandType) {
        case RemoteServices.ClimateNow:
          result = await api.startClimateControl(VIN);
          break;
        case RemoteServices.LockDoors:
          result = await api.lockDoors(VIN);
          break;
        case RemoteServices.UnlockDoors:
          result = await api.unlockDoors(VIN);
          break;
        case RemoteServices.BlowHorn:
          result = await api.blowHorn(VIN);
          break;
        case RemoteServices.FlashLight:
          result = await api.flashLights(VIN);
          break;
        case RemoteServices.ChargeStart:
          result = await api.startCharging(VIN);
          break;
        case RemoteServices.ChargeStop:
          result = await api.stopCharging(VIN);
          break;
        default:
          toast.style = Toast.Style.Failure;
          toast.title = "Unknown command";
          break;
      }

      if (result) {
        toast.style = Toast.Style.Success;
        toast.title = "Done!";
      }
    } catch (err) {
      if (err instanceof Error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = err.message;
      }
    }
  }
}
