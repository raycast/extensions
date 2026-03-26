import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.replace(/\n{2,}/g, "\n"), "Double → single newlines");
}
