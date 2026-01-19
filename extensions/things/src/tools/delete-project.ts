import { Tool } from '@raycast/api';
import { deleteProject, getProjectName } from '../api';

type Input = {
  /** The project id to delete */
  projectId: string;
};

export default async function ({ projectId }: Input) {
  return await deleteProject(projectId);
}

export const confirmation: Tool.Confirmation<Input> = async ({ projectId }: Input) => {
  const name = await getProjectName(projectId);

  return {
    message: `Are you sure you want to delete the project?`,
    info: [{ name: 'Project', value: name }],
  };
};
