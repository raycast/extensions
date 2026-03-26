import { transformSelection } from "./utils";

export default async function Command() {
  await transformSelection((t) => t.replace(/(?<!\n)\n(?!\n)/g, "\n\n"), "Single → double newlines");
}
