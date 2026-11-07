import { showHUD } from "@raycast/api";
import { stopReading } from "./reader";

export default async function Command() {
  await showHUD(stopReading() ? "Stopped reading" : "Nothing is being read");
}
