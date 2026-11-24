import { pasteTransformed } from "./paste";
import { titleCase } from "./transforms";

export default async function Command() {
  await pasteTransformed(titleCase);
}
