import { open, showHUD } from "@raycast/api";
import { dashboardUrl } from "./api";

export default async function Command() {
  await open(dashboardUrl());
  await showHUD("Opening Privatus Analytics");
}
