import { addProject } from '../api';
import { ProjectParams } from '../types';

export default async function (props: ProjectParams) {
  return await addProject(props);
}
