import { open, showHUD } from "@raycast/api";
import { HEJOUR_WEBSITE } from "./lib/hejour";

export default async function main() {
  try {
    await open("hejour://today");
  } catch {
    await open(HEJOUR_WEBSITE);
    await showHUD("Hejour is not installed");
  }
}
