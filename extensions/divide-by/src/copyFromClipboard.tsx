import { showHUD, Clipboard, Cache } from "@raycast/api";

const cache = new Cache();

export default async function InputNumber() {
  const input = await Clipboard.readText();

  if (!Number(input)) {
    await showHUD(`❌ Not a number in clipboard`);
  } else {
    const cached = cache.get("divideBy");
    const divideBy = cached ? JSON.parse(cached) : 8;

    const divided = Number(input) / Number(divideBy);
    await Clipboard.copy(divided);
    await showHUD(`Copied ${divided} to clipboard`);
  }
}
