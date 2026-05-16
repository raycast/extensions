import { getSurvey } from "../api/surveys";
import { getActiveProjectId, projectUrl } from "./_shared";

type Input = {
  /** The survey ID (UUID string). Get this from `surveys-get-all`. */
  surveyId: string;
};

export default async function (input: Input) {
  const projectId = await getActiveProjectId();
  const survey = await getSurvey(projectId, input.surveyId);
  return { ...survey, url: projectUrl(`surveys/${survey.id}`) };
}
