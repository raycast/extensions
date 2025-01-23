import { Clipboard } from "@raycast/api";
import { update } from "./util";
import { decode, isValid } from "js-base64";

export default async () => {
  try {
    const { text: clipboard } = await Clipboard.read();
    if (!isValid(clipboard)) throw "Not a valid base64 string";
    const decoded = decode(clipboard);
    await update({ contents: decoded });
  } catch (error) {
    await update({ error });
  }
};
