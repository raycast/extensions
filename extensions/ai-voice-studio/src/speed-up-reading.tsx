import { runMimoSpeedUp } from "./mimo-speed-up";
import { runOpenAISpeedUp } from "./openai-speed-up";
import { runQwenSpeedUp } from "./qwen-speed-up";
import { getDefaultProvider } from "./utils/provider";

export default async function SpeedUpReading() {
  const provider = await getDefaultProvider();
  if (provider === "openai") {
    await runOpenAISpeedUp();
    return;
  }
  if (provider === "mimo") {
    await runMimoSpeedUp();
    return;
  }
  await runQwenSpeedUp();
}
