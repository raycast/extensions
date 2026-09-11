import { getCollections } from '../api';

export default async function () {
  const { projects } = await getCollections('projects');
  return projects;
}
