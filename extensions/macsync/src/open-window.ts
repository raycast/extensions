import { open, showHUD } from "@raycast/api";

export default async function Command() {
  try {
    await open("macsync://review");
  } catch {
    await showHUD("MacSync isn't installed, or is older than 0.6.0.");
  }
}
