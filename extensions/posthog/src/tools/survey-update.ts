import { Tool } from "@raycast/api";

import { getSurvey, updateSurvey } from "../api/surveys";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The survey ID (UUID string). Get this from `surveys-get-all`. */
  surveyId: string;
  /** New name. */
  name?: string;
  /** New description. */
  description?: string;
  /** Archive (true) or unarchive (false). */
  archived?: boolean;
  /** ISO 8601 datetime to launch the survey. */
  start_date?: string;
  /** ISO 8601 datetime to stop the survey. */
  end_date?: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const { surveyId, ...patch } = input;
  const survey = await updateSurvey(projectId, surveyId, patch);
  return { ...survey, url: projectUrl(`surveys/${survey.id}`) };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getSurvey(projectId, input.surveyId);
  const info: { name: string; value: string }[] = [{ name: "Survey", value: current.name }];
  if (input.name) info.push({ name: "New name", value: input.name });
  if (input.archived !== undefined) info.push({ name: "Archived", value: String(input.archived) });
  if (input.start_date) info.push({ name: "Launch at", value: input.start_date });
  if (input.end_date) info.push({ name: "Stop at", value: input.end_date });
  return { message: "Update this survey?", info };
};
