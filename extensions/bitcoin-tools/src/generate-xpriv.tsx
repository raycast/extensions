import { generateXpriv } from "./lib/bitcoin";
import { generateAndOutput } from "./lib/generated-output";

export default async function Command() {
  await generateAndOutput(generateXpriv, "XPRIV", true);
}
