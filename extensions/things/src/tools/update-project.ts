import { updateProject } from '../api';
import { UpdateProjectParams } from '../types';

type Input = {
  /** The project id to update */
  projectId: string;
  /** The parameters to update */
  projectParams: UpdateProjectParams;
};

export default async function ({ projectId, projectParams }: Input) {
  try {
    const project = await updateProject(projectId, projectParams);
    return project;
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return {
        error: 'No token provided',
        message:
          'Add your Things token in the extension settings. You can find your unique token in Things settings. go to Things → Settings → General → Enable Things URLs → Manage',
      };
    }
    throw error;
  }
}
