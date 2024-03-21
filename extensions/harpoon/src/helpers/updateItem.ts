import HarpoonError, { ErrorCode } from "../HarpoonError";
import { App } from "../models";
import getList from "./getList";
import setList from "./setList";

export default async function updateItem(item: App, updates: Partial<App>): Promise<void> {
  const list = await getList();

  const index = list.findIndex(({ path }) => path === item.path);

  if (index === -1) {
    throw new HarpoonError(ErrorCode.itemNotFound);
  }

  list[index] = {
    ...list[index],
    ...updates,
  };

  await setList(list);
}
