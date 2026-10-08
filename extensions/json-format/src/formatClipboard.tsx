import { Clipboard } from "@raycast/api";
import { formatJS, copyFormattedJs } from "./utils";

export default async () => {
  const output = await formatJS((await Clipboard.readText()) || "");

  if (output) {
    await copyFormattedJs(output);
  }
};
