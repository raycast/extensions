import { generateAddress } from "./lib/bitcoin";
import { generateAndOutput } from "./lib/generated-output";

export default async function Command() {
  await generateAndOutput(generateAddress, "Address");
}
