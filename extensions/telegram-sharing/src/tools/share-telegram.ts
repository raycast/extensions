import { open } from "@raycast/api";

type Input = {
  /**
   * The text content to share to Telegram
   */
  text: string;
};

export default async function tool(input: Input) {
  const { text } = input;

  if (!text || text.trim().length === 0) {
    return "No text provided to share.";
  }

  await open(`tg://msg_url?url=&text=${encodeURIComponent(text)}`);

  return "Opened Telegram to share the content.";
}
