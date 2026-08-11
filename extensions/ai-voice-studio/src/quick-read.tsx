import { LaunchType, launchCommand } from "@raycast/api";
import { getDefaultProvider } from "./utils/provider";

const PROVIDER_COMMANDS = {
  qwen: "qwen-quick-read",
  mimo: "mimo-quick-read",
  openai: "openai-quick-read",
} as const;

export default async function QuickRead() {
  const provider = await getDefaultProvider();
  await launchCommand({ name: PROVIDER_COMMANDS[provider], type: LaunchType.UserInitiated });
}
