import { pasteTransformed } from "./paste";
import { uppercase } from "./transforms";

export default async function Command() {
  await pasteTransformed(uppercase);
}
