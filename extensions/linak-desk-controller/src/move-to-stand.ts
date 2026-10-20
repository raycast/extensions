import { moveToPreset } from "./desk";

export default async function moveToStand() {
  await moveToPreset("stand");
}
