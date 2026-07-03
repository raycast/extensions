import { transformCase } from "./lib/case-clipboard";

export default async function Command() {
  await transformCase("Converted to UPPERCASE", (text) => text.toUpperCase());
}
