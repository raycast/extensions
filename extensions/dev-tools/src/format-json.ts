import { transformClipboard } from "./lib/format-clipboard";
import { convert } from "./lib/formats";

export default async function Command() {
  await transformClipboard("Formatted JSON", (text) => convert(text, "json", "json", { indent: "2" }));
}
