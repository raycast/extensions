import { showHUD } from "@raycast/api";
import { failure, macsync } from "./run";

export default async function Command() {
  try {
    await showHUD((await macsync("status")).split("\n").join(" · "));
  } catch (e) {
    await showHUD(failure(e));
  }
}
