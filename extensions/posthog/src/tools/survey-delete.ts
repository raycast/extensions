import { Action, Tool } from "@raycast/api";

import { deleteSurvey, getSurvey } from "../api/surveys";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The survey ID (UUID string). Get this from `surveys-get-all`. */
  surveyId: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  await deleteSurvey(projectId, input.surveyId);
  return { deleted: input.surveyId };
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const projectId = await getActiveProjectId();
  const current = await getSurvey(projectId, input.surveyId);
  return {
    style: Action.Style.Destructive,
    message: `Delete survey "${current.name}"?`,
    info: [
      { name: "Survey", value: current.name },
      { name: "ID", value: current.id },
    ],
  };
};
