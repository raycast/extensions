import { message } from "./messages";
import type { MessageKey } from "./catalog";

export function t(key: MessageKey): string {
  return message(key);
}
