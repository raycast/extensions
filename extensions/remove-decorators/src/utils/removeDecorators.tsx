import { getPreferenceValues, Clipboard, showHUD } from "@raycast/api";

function autoPasteEnabled(): boolean {
  const { autopaste } = getPreferenceValues();
  return autopaste;
}

async function removeDecorators(codeStr: string) {
  const lines = codeStr.split("\n");
  let newCodeStr = "";

  for (const line of lines) {
    if (!line.includes("@") && !line.includes("import")) {
      newCodeStr += line + "\n";
    }
  }
  // Return the modified code string
  const formatted = newCodeStr.trim();

  if (autoPasteEnabled()) {
    await Clipboard.paste(formatted);
    await showHUD("✅ Pasted succesfully!");
  } else {
    await Clipboard.copy(formatted);
    await showHUD("✅ Copied succesfully!");
  }
}

export default removeDecorators;
