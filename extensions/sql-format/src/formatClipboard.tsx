import { Clipboard } from "@raycast/api";
import { formatSQL, copyFormattedSQL } from "./utils";

export default async () => {
  const output = formatSQL((await Clipboard.readText()) || "");
  if (output) {
    await copyFormattedSQL(output);
  }
};
