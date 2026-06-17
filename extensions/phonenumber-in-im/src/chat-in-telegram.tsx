import { invoke } from "./commons";
import type { ExtLaunchProps } from "./types";

export default function ChatInTelegram(props: ExtLaunchProps) {
  return invoke(props, "Telegram");
}
