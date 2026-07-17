import * as google from "../api/oauth";
import { fetchList } from "../api/endpoints";

type Input = {
  listId: string;
  showCompleted?: boolean;
};

export default async function (input: Input) {
  await google.authorize();
  const tasks = await fetchList(input.listId, input.showCompleted);
  return tasks.map((t) => ({ id: t.id, title: t.title, due: t.due, notes: t.notes, status: t.status }));
}
