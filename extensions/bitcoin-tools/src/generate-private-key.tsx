import { generateWif } from "./lib/bitcoin";
import { generateAndOutput } from "./lib/generated-output";

export default async function Command() {
  await generateAndOutput(generateWif, "WIF", true);
}
