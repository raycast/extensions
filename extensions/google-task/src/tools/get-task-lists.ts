import * as google from "../api/oauth";
import { fetchLists } from "../api/endpoints";

export default async function () {
  await google.authorize();
  const lists = await fetchLists();
  return lists;
}
