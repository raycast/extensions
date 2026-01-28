import { getTags } from '../api';

export default async function () {
  const tags = await getTags();
  return tags;
}
