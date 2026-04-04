import { openChat } from "../services/openChat";
import { getServiceDisplayName } from "../utils/service-icons";

type Input = {
  name: string;
  service?: string;
};

export default async function (input: Input) {
  const result = await openChat({
    chatName: input.name,
    service: input.service,
  });

  if (!result.success) {
    const suggestionText = result.suggestions?.length ? ` Similar contacts: ${result.suggestions.join(", ")}` : "";
    throw new Error((result.error || "Failed to open chat") + suggestionText);
  }

  const serviceName = result.chat?.service ? getServiceDisplayName(result.chat.service) : input.service || "Beeper";

  return {
    openedChat: result.chat?.name || input.name,
    service: serviceName,
  };
}
