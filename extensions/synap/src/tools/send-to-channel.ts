import { getChannels, requireAgentConnection, sendToChannel } from "../api/client";

type Input = {
  /** Message content to send */
  message: string;
  /** Channel name or ID. Leave empty to send to the personal (AI) channel */
  channel?: string;
};

export default async function tool(input: Input) {
  await requireAgentConnection();
  const channels = await getChannels();

  let target = channels.find((c) => (c.type === "thread" && c.agentType === "orchestrator") || c.name === "personal");

  if (input.channel) {
    const match = channels.find(
      (c) => c.id === input.channel || c.name.toLowerCase().includes(input.channel!.toLowerCase())
    );
    if (match) target = match;
  }

  if (!target) {
    return {
      success: false,
      message: "No channel found. Available: " + channels.map((c) => c.name).join(", "),
    };
  }

  await sendToChannel({ channelId: target.id, content: input.message });
  return { success: true, channelId: target.id, channelName: target.name, message: "Message sent" };
}
