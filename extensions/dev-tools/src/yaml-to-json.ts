import { transformClipboard } from "./lib/format-clipboard";
import { convert } from "./lib/formats";

export default async function Command() {
  await transformClipboard("YAML → JSON", (text) => convert(text, "yaml", "json", { indent: "2" }));
}
