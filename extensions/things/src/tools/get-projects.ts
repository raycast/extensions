import { getProjects } from '../api';

export default async function () {
  const projects = await getProjects();
  return projects;
}
