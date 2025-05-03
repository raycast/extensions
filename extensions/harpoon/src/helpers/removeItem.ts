import { App } from "../models";
import getList from "./getList";
import setList from "./setList";

export default async function removeItem(item: App): Promise<void> {
  const list = await getList();

  const index = list.findIndex(({ path }) => path === item.path);

  if (index === -1) {
    return;
  }

  list.splice(index, 1);

  await setList(list);
}
