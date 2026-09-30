import { showHUD } from "@raycast/api";
import { signOutAndClearLocalState } from "./lib/actions";

export default async function Command() {
  await signOutAndClearLocalState();
  await showHUD("Signed out of Nibit");
}
