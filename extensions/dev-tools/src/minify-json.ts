import { transformClipboard } from "./lib/format-clipboard";
import { convert } from "./lib/formats";

export default async function Command() {
  await transformClipboard("Minified JSON", (text) => convert(text, "json", "json", { indent: "minified" }));
}
