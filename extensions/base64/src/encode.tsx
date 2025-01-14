import { Clipboard } from "@raycast/api";
import { update } from "./util";
import { encode } from "js-base64";

export default async () => {
  try {
    const { text: clipboard } = await Clipboard.read();
    const encoded = encode(clipboard);
    await update({ contents: encoded });
  } catch (error) {
    await update({ error });
  }
};
