import { getCollections } from '../api';

export default async function () {
  const { areas } = await getCollections('areas');
  return areas;
}
