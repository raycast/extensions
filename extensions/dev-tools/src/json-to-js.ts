import { transformClipboard } from "./lib/format-clipboard";
import { convert } from "./lib/formats";

export default async function Command() {
  // A bare object literal so it can be pasted into any context; the JSON Converter
  // view exposes the quote/declaration options for finer control.
  await transformClipboard("JSON → JS Object", (text) => convert(text, "json", "js", { indent: "2" }));
}
