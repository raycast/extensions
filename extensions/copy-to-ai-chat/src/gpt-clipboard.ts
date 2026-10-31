import { openChat } from "./open-chat";

export default async function Command() {
  await openChat("chatgpt", { useClipboard: true });
}
