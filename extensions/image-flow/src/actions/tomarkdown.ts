import { Input, Output } from "../types";
import path from "path";

/**
 * Convert the input to markdown.
 *
 * @param i image file path or url
 *
 * @return markdown string
 */
export default async function (i: Input): Promise<Output> {
  const name = i.type === "filepath" ? path.basename(i.value) : "image";

  return { type: "markdown", value: `![${name}](${encodeURI(i.value)})` } as Output;
}
