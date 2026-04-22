import { Action, Tool } from "@raycast/api";
import { createIdea } from "../utils/buffer-api";
import { getCurrentOrganizationContext } from "./shared";

type Input = {
  /**
   * Optional title for the idea.
   */
  title?: string;
  /**
   * Optional body text for the idea.
   */
  text?: string;
  /**
   * Optional ISO 8601 target date for the idea.
   */
  date?: string;
  /**
   * Optional list of target services such as instagram, linkedin, or x.
   */
  services?: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    style: Action.Style.Regular,
    message: "Create this Buffer idea?",
    info: [
      { name: "Title", value: input.title },
      { name: "Date", value: input.date },
      { name: "Text", value: input.text },
    ],
  };
};

/**
 * Create a Buffer idea in the current organization.
 */
export default async function tool(input: Input) {
  if (!input.title?.trim() && !input.text?.trim()) {
    throw new Error("Provide at least a title or text when creating an idea.");
  }

  const { organization } = await getCurrentOrganizationContext();
  const date = input.date ? new Date(input.date) : undefined;

  if (date && Number.isNaN(date.getTime())) {
    throw new Error("date must be a valid ISO 8601 date-time string.");
  }

  const idea = await createIdea({
    organizationId: organization.id,
    title: input.title?.trim() || undefined,
    text: input.text?.trim() || undefined,
    date,
    services: input.services?.filter(Boolean),
  });

  return {
    success: true,
    organization: organization.name,
    idea: {
      id: idea.id,
      title: idea.content.title,
      text: idea.content.text,
      services: idea.content.services,
      date: idea.content.date,
    },
    message: `Idea created in ${organization.name}.`,
  };
}
