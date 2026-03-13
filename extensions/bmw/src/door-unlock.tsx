import { RemoteServices } from "bmw-connected-drive";
import ViewCar from "./view-car";

export default function Command() {
  return <ViewCar command={RemoteServices.UnlockDoors} />;
}
