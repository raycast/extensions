import { showHUD } from "@raycast/api";
import { checkConnection, humanizeError } from "./gemini";

export default async function Command() {
  await showHUD("🧪 Checking the Gemini connection…");

  try {
    const result = await checkConnection();
    await showHUD(`✅ Gemini connected | ${result.model} | ${result.route}`);
  } catch (error) {
    console.error("Gemini setup check failed");
    await showHUD(`❌ ${humanizeError(error)}`);
  }
}
