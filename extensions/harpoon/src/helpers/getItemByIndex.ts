import HarpoonError, { ErrorCode } from "../HarpoonError";
import { App } from "../models";
import getList from "./getList";

export default async function getItemByIndex(index: number): Promise<App> {
  const list = await getList();

  const item = list.at(index);

  if (!item) {
    throw new HarpoonError(ErrorCode.itemNotFound);
  }

  return item;
}
