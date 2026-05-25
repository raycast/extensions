import { runMimoSpeedDown } from "./mimo-speed-down";
import { runOpenAISpeedDown } from "./openai-speed-down";
import { runQwenSpeedDown } from "./qwen-speed-down";
import { getDefaultProvider } from "./utils/provider";

export default async function SlowDownReading() {
  const provider = await getDefaultProvider();
  if (provider === "openai") {
    await runOpenAISpeedDown();
    return;
  }
  if (provider === "mimo") {
    await runMimoSpeedDown();
    return;
  }
  await runQwenSpeedDown();
}
