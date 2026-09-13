import { Tool } from "@raycast/api";
import { sendPrompt } from "../lib/gateway";
import { takePendingSend, writePendingSend } from "../lib/pending-send";
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
  writePendingSend({
    bot: input.bot,
    prompt: input.prompt,
    target: { id: target.id, name: target.name },
  });
  return {
    message: `Send this task to ${target.name}?`,
    info: [
      { name: "Bot", value: target.name },
      { name: "Task", value: input.prompt },
    ],
  };
};

export default async function tool(input: Input) {
  const pending = takePendingSend({ bot: input.bot, prompt: input.prompt });
  if (pending === null) {
    throw new Error("Confirm the recipient before sending.");
  }

  const sendResult = await sendPrompt({ agentId: pending.id, prompt: input.prompt.trim() });
  if (!sendResult.ok) {
    throw new Error(gatewayErrorMessage(sendResult.error));
  }

  return `Sent task to ${pending.name}.`;
}
