import { Action } from "@raycast/api";
import { openGrokBot } from "../lib/open-app";

export function OpenGrokBotAction() {
  return <Action title="Open Grok Bot" icon={{ source: "grok-bot.png" }} onAction={openGrokBot} />;
}
