import { nightlight } from "./utils";
import { getPreferenceValues, closeMainWindow } from "@raycast/api";

export default async function main() {
  const { closeWindow } = getPreferenceValues<{ closeWindow: boolean }>();

  if (closeWindow) await closeMainWindow();
  await nightlight(["toggle"]);
}
