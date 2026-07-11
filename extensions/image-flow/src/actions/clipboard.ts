import { Input, Output } from "../types";
import { Clipboard } from "@raycast/api";

/**
 * Copy the input to clipboard.
 *
 * @param i image file path or url
 *
 * @return the input itself
 */
export default async function (i: Input): Promise<Output> {
  i.type === "filepath"
    ? await Clipboard.copy({ file: i.value } as Clipboard.Content)
    : await Clipboard.copy({ text: i.value } as Clipboard.Content);

  return i as Output;
}
