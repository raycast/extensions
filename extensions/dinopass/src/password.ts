import { Clipboard, showHUD } from "@raycast/api";

export async function fetchPassword(type: "simple" | "strong") {
  await showHUD("⏳ Generating password...");

  try {
    const response = await fetch(`https://dinopass.com/password/${type}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const password = (await response.text()).trim();
    if (!password) throw new Error("Empty response body");

    await Clipboard.copy(password, { concealed: true });
    await showHUD("✅ Password copied to clipboard");
  } catch {
    await showHUD("❌ Failed to fetch password");
  }
}
