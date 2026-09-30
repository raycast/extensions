import { Icon } from "@raycast/api";
import { RemoteServices } from "bmw-connected-drive";

interface CommandDetails {
  icon: Icon;
  command: RemoteServices;
  commandName: string;
  loadingMessage: string;
}

export function getCommandDetails(command: RemoteServices) {
  let commandObj: CommandDetails = {
    icon: Icon.AlarmRinging,
    command: RemoteServices.BlowHorn,
    commandName: "",
    loadingMessage: "",
  };
  switch (command) {
    case RemoteServices.ClimateNow:
      commandObj = {
        icon: Icon.Temperature,
        command: command,
        commandName: "start climate control",
        loadingMessage: "Starting climate control",
      };
      break;
    case RemoteServices.LockDoors:
      commandObj = {
        icon: Icon.Lock,
        command: command,
        commandName: "lock doors",
        loadingMessage: "Locking doors",
      };
      break;
    case RemoteServices.UnlockDoors:
      commandObj = {
        icon: Icon.LockUnlocked,
        command: command,
        commandName: "unlock doors",
        loadingMessage: "Unlocking doors",
      };
      break;
    case RemoteServices.BlowHorn:
      commandObj = {
        icon: Icon.AlarmRinging,
        command: command,
        commandName: "blow horn",
        loadingMessage: "Blowing horn",
      };
      break;
    case RemoteServices.FlashLight:
      commandObj = {
        icon: Icon.LightBulb,
        command: command,
        commandName: "flash lights",
        loadingMessage: "Flashing lights",
      };
      break;
    case RemoteServices.ChargeStart:
      commandObj = {
        icon: Icon.Bolt,
        command: command,
        commandName: "start charging",
        loadingMessage: "Starting charge",
      };
      break;
    case RemoteServices.ChargeStop:
      commandObj = {
        icon: Icon.BoltDisabled,
        command: command,
        commandName: "stop charging",
        loadingMessage: "Stopping charge",
      };
      break;
    default:
      break;
  }

  return commandObj;
}
