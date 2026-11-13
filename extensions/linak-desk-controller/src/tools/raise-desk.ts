import { moveToPreset } from "../desk";

export default async function raiseDesk() {
  return await moveToPreset("stand");
}
