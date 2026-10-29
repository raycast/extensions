import { showHUD } from "@raycast/api";
import { stopAll } from "./player";

export default async function Command() {
  const n = stopAll();
  await showHUD(n ? `Stopped ${n} sound${n === 1 ? "" : "s"}` : "Nothing was playing");
}
