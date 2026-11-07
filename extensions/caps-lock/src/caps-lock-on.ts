import { setCapsLock } from "swift:../swift/caps-lock";
import { report } from "./report";

export default async function Command() {
  await report(() => setCapsLock(true));
}
