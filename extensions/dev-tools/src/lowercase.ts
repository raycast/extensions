import { transformCase } from "./lib/case-clipboard";

export default async function Command() {
  await transformCase("Converted to lowercase", (text) => text.toLowerCase());
}
