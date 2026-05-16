import { getSurveyStats } from "../api/surveys";
import { getActiveProjectId } from "./_shared";

type Input = {
  /** The survey ID (UUID string). Get this from `surveys-get-all`. */
  surveyId: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  return await getSurveyStats(projectId, input.surveyId);
}
