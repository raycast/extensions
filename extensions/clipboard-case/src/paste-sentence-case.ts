import { pasteTransformed } from "./paste";
import { sentenceCase } from "./transforms";

export default async function Command() {
  await pasteTransformed(sentenceCase);
}
