import { Clipboard, getSelectedText, showHUD } from "@raycast/api";
import { convertText } from "./lib/converter";
import { getDictionary } from "./lib/storage";

export default async function Command() {
  let selected: string;
  try {
    selected = await getSelectedText();
  } catch {
    await showHUD("⚠️ 無法取得選取的文字");
    return;
  }

  if (!selected || !selected.trim()) {
    await showHUD("⚠️ 沒有選取任何文字");
    return;
  }

  const dictionary = await getDictionary();
  const { text, direction } = convertText(selected, dictionary);

  await Clipboard.paste(text);

  const label = direction === "s2t" ? "簡體 → 繁體" : "繁體 → 簡體";
  await showHUD(`✅ 已轉換（${label}）`);
}
