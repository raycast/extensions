import { getCollections } from '../api';

export default async function () {
  const { tags } = await getCollections('tags');
  return tags;
}
