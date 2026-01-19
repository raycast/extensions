import { open, showHUD } from "@raycast/api";
import { getSubscribeUrl } from "./api/substack";

export default async function Command() {
  await open(getSubscribeUrl());
  await showHUD("Opening Raycast Weekly subscription page...");
}
