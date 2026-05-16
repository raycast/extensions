import { getSurveysGlobalStats } from "../api/surveys";
import { getActiveProjectId } from "./_shared";

export default async function () {
  const projectId = await getActiveProjectId();
  return await getSurveysGlobalStats(projectId);
}
