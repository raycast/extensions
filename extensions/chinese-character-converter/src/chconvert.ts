import { Clipboard, showHUD, PopToRootType } from "@raycast/api";
// 引入 opencc-js
import * as OpenCC from "opencc-js";

export default async function Command() {
  // 1. Read clipboard content
  const text = await Clipboard.readText();

  // If clipboard is empty or has no text, show error
  if (!text) {
    await showHUD("❌ No text in clipboard", {
      clearRootSearch: true,
      popToRootType: PopToRootType.Immediate,
    });
    return;
  }

  // 2. Setup converter
  // cn -> tw (Simplified to Traditional)
  const converterToTrad = OpenCC.Converter({ from: "cn", to: "tw" });
  // tw -> cn (Traditional to Simplified)
  const converterToSimp = OpenCC.Converter({ from: "tw", to: "cn" });

  // 3. Auto-detection logic
  // Try converting to Traditional first
  const tradText = converterToTrad(text);

  let resultText = "";
  let hudMessage = "";

  if (tradText !== text) {
    // If converted text differs from original, it contains Simplified Chinese
    // So our target is this Traditional version
    resultText = tradText;
    hudMessage = "🇹🇼 Converted to Traditional";
  } else {
    // If no change, original is likely Traditional (or English/Number)
    // So we convert it to Simplified
    resultText = converterToSimp(text);
    // If changed after converting to Simplified, show success, otherwise no change
    if (resultText !== text) {
      hudMessage = "🇨🇳 Converted to Simplified";
    } else {
      hudMessage = "⚠️ No conversion needed";
    }
  }

  // 4. Write result back to clipboard
  await Clipboard.copy(resultText);

  // 5. Show HUD notification
  await showHUD(hudMessage);
}
