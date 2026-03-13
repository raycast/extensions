import { invoke } from "./commons";
import type { ExtLaunchProps } from "./types";

export default function ChatInWhatsApp(props: ExtLaunchProps) {
  return invoke(props, "WhatsApp");
}
