import { Tool } from "@raycast/api";
import { sendPrompt } from "../lib/gateway";
import { resolveToolBot } from "../lib/tool-roster";
import { gatewayErrorMessage } from "../lib/types";

type Input = {
  /**
   * Bot name or id. A unique name or title substring is enough when it matches one teammate.
   * Call list-bots first when the name is missing or could match more than one bot.
   *
   * @example "Piper"
   */
  bot: string;
  /**
   * Task to send. Do not answer the task yourself.
   *
   * @example "Summarize this week's errors"
   */
  prompt: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const target = await resolveToolBot(input.bot);
  return {
    message: `Send this task to ${target.name}?`,
    info: [
      { name: "Bot", value: target.name },
      { name: "Task", value: input.prompt },
    ],
  };
};

export default async function tool(input: Input) {
  const target = await resolveToolBot(input.bot);
  const sendResult = await sendPrompt({ agentId: target.id, prompt: input.prompt.trim() });
  if (!sendResult.ok) {
    throw new Error(gatewayErrorMessage(sendResult.error));
  }

  return `Sent task to ${target.name}.`;
}
