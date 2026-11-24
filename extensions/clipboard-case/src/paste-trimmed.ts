import { pasteTransformed } from "./paste";
import { trimWhitespace } from "./transforms";

export default async function Command() {
  await pasteTransformed(trimWhitespace);
}
