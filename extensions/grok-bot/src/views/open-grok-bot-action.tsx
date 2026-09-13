import { Action } from "@raycast/api";
import { extensionIcon } from "../lib/extension-icon";
import { openGrokBot } from "../lib/open-app";

export function OpenGrokBotAction() {
  return <Action title="Open Grok Bot" icon={extensionIcon} onAction={openGrokBot} />;
}
