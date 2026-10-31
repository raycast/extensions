import { Icon } from "@raycast/api";
import type { AiCommand } from "../lib/commands/types";

export function commandIcon(command: AiCommand): Icon {
  return Icon[command.icon as keyof typeof Icon] ?? Icon.Stars;
}
