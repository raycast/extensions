import { getWebUiBaseUrl } from "./econnect";
import { open, showHUD } from "@raycast/api";

export default async function Command() {
  const url = getWebUiBaseUrl();
  await open(url);
  await showHUD(`Opened ${url}`);
}
