import { EDeviceStates } from "unifi-client";

export function deviceStateToString(state: EDeviceStates) {
  switch (state) {
    case EDeviceStates.ADOPTING:
      return "Adopting";
    case EDeviceStates.CONNECTED:
      return "Connected";
    case EDeviceStates.ADOPTION_ERROR:
      return "Adoption Error";
    case EDeviceStates.ISOLATED:
      return "Isolated";
    case EDeviceStates.OFFLINE:
      return "Offline";
    case EDeviceStates.PENDING_ADOPTION:
      return "Pending Adoption";
    case EDeviceStates.PROVISIONING:
      return "Provisioning";
    case EDeviceStates.UNREACHABLE:
      return "Unreachable";
    case EDeviceStates.UPDATING:
      return "Updating";
    default:
      return "Unknown State";
  }
}
