import { Tool } from "@raycast/api";

import { createSurvey } from "../api/surveys";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** Survey name. */
  name: string;
  /** Optional description. */
  description?: string;
  /** Survey type. Defaults to "popover". */
  type?: "popover" | "button" | "api" | "widget";
  /**
   * Array of question objects. Each is `{ type: "open"|"link"|"rating"|"single_choice"|"multiple_choice", question: string }`.
   */
  questions: Array<{ type: string; question: string; description?: string }>;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const survey = await createSurvey(projectId, {
    name: input.name,
    description: input.description ?? "",
    type: input.type ?? "popover",
    questions: input.questions,
  });
  return { ...survey, url: projectUrl(`surveys/${survey.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: `Create survey "${input.name}"?`,
  info: [
    { name: "Name", value: input.name },
    { name: "Type", value: input.type ?? "popover" },
    { name: "Questions", value: String(input.questions.length) },
  ],
});
