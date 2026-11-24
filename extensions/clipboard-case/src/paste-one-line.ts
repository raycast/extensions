import { pasteTransformed } from "./paste";
import { oneLine } from "./transforms";

export default async function Command() {
  await pasteTransformed(oneLine);
}
