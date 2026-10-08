import HarpoonError, { ErrorCode } from "../HarpoonError";
import { App } from "../models";
import getList from "./getList";
import setList from "./setList";

export default async function updateItem(index: number, updates: Partial<App>): Promise<void> {
  const list = await getList();

  const item = list.at(index);

  if (!item) {
    throw new HarpoonError(ErrorCode.itemNotFound);
  }

  list[index] = {
    ...item,
    ...updates,
  };

  await setList(list);
}
