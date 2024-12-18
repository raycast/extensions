import { showHUD } from "@raycast/api";
import { randomNumberBetween } from "./random";
import maybeWait from "./delay";

export default async function RollDie(min: number, max: number) {
  const value = randomNumberBetween(min, max).toString();
  await maybeWait();
  showHUD(`Rolled ${value}`, { clearRootSearch: true });
}
