import { addProject, ProjectParams } from '../api';

export default async function (props: ProjectParams) {
  await addProject(props);
}
