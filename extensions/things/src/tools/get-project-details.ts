import { queryProjectDetails } from '../api';

type Input = {
  /** The ID of the project to retrieve full details for. */
  projectId: string;
};

export default async function ({ projectId }: Input) {
  if (!projectId?.trim()) {
    throw new Error('projectId is required.');
  }
  const details = await queryProjectDetails(projectId.trim());
  if (!details) {
    throw new Error(`Project with ID "${projectId}" not found.`);
  }
  return details;
}
