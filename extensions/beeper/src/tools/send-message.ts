import { Tool } from "@raycast/api";
import { sendMessage } from "../services/sendMessage";
import { getServiceDisplayName } from "../utils/service-icons";

type Input = {
  name: string;
  message: string;
  service?: string;
};

export default async function (input: Input) {
  const result = await sendMessage({
    chatName: input.name,
    message: input.message,
    service: input.service,
  });

  if (!result.success) {
    const suggestionText = result.suggestions?.length ? ` Similar contacts: ${result.suggestions.join(", ")}` : "";
    throw new Error((result.error || "Failed to send message") + suggestionText);
  }

  const serviceName = result.service ? getServiceDisplayName(result.service) : input.service || "Beeper";

  return {
    sentTo: result.sentTo || input.name,
    service: serviceName,
    messageSent: true,
  };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const servicePart = input.service ? ` via ${input.service}` : "";

  return {
    message: `Send message to "${input.name}"${servicePart}?`,
    info: [
      {
        name: "Recipient",
        value: input.name,
      },
      {
        name: "Message",
        value: input.message.length > 100 ? input.message.substring(0, 100) + "..." : input.message,
      },
      {
        name: "Service",
        value: input.service || "Auto-detect (first matching chat)",
      },
    ],
  };
};
