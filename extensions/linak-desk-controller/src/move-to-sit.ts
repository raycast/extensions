import { moveToPreset } from "./desk";

export default async function moveToSit() {
  await moveToPreset("sit");
}
