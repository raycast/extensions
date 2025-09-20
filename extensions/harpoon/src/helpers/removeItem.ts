import getList from "./getList";
import setList from "./setList";

export default async function removeItem(index: number): Promise<void> {
  const list = await getList();

  list.splice(index, 1);

  await setList(list);
}
