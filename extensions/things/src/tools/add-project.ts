import { addProject } from '../api';
import { AddProjectParams } from '../types';

export default async function (props: AddProjectParams) {
  return await addProject(props);
}
