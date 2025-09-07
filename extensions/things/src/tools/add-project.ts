import { addProject, ProjectParams } from '../api';

export default async function (props: ProjectParams) {
  return await addProject(props);
}
