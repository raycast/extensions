import { getLists } from '../api';

export default async function () {
  const lists = await getLists();
  return lists;
}
