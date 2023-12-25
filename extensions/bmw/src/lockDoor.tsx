import { RemoteServices } from "bmw-connected-drive";
import ViewCar from "./viewCar";

export default function Command() {
  return <ViewCar command={RemoteServices.LockDoors} loadingMessage="Locking your BMW..." />;
}
