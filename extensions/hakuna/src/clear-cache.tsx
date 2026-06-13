import { showHUD } from "@raycast/api";
import { HakunaClient } from "./hakuna-api";

export default async function Command() {
  HakunaClient.clearCache();
  await showHUD("Hakuna cache cleared");
}
