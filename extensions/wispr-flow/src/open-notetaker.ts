import { openWisprFlow } from "./db";
import { NOTETAKER_URL, runNotetakerCommand } from "./notetaker";

export default async function main() {
  await runNotetakerCommand(async () => {
    await openWisprFlow(NOTETAKER_URL);
  });
}
