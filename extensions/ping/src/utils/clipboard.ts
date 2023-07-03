import { Clipboard, showHUD } from "@raycast/api";

interface ClipboardType {
  get: () => void;
  set: (contents: string) => void;
}

const isEmpty = (string: string) => {
  return string.length === 0;
};

const get = async () => {
  const text = String(await Clipboard.readText());
  if (isEmpty(text)) throw "Clipboard is empty";
  else return text;
};

const set = async (contents: string) => {
  await Clipboard.copy(contents);
  await showHUD("Copied to clipboard");
};

const clipboard: ClipboardType = {
  get,
  set,
};

export default clipboard;
