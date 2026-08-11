import { getCollections } from '../api';

export default async function () {
  const { lists } = await getCollections('lists');
  return lists;
}
