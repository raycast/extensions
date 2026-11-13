import { moveToPreset } from "../desk";

export default async function lowerDesk() {
  return await moveToPreset("sit");
}
