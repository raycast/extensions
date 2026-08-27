import { Tool } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";

import { createSingleUseLink } from "../api/event-types";
import { calendlyOAuth } from "../oauth/calendly";

interface Input {
  /** Event type URI returned by List Event Types. */
  eventTypeUri: string;
  /** Human-readable event type name, used only in the confirmation. */
  eventTypeName?: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create a single-use scheduling link${input.eventTypeName ? ` for ${input.eventTypeName}` : ""}?`,
  info: [{ name: "Event Type", value: input.eventTypeName ?? input.eventTypeUri }],
});

async function tool(input: Input) {
  return createSingleUseLink(input.eventTypeUri);
}

export default withAccessToken(calendlyOAuth)(tool);
