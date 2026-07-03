import { transformClipboard } from "./lib/format-clipboard";
import { convert } from "./lib/formats";

export default async function Command() {
  await transformClipboard("JSON → YAML", (text) => convert(text, "json", "yaml"));
}
