import { openChat } from "./open-chat";

export default async function Command() {
  await openChat("gemini", { useClipboard: true });
}
