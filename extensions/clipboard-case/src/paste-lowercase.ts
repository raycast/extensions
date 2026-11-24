import { pasteTransformed } from "./paste";
import { lowercase } from "./transforms";

export default async function Command() {
  await pasteTransformed(lowercase);
}
