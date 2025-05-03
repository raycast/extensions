import HarpoonError, { ErrorCode } from "../HarpoonError";
import { App } from "../models";
import getList from "./getList";

export default async function getItemByIndex(index: number): Promise<App> {
  const list = await getList();

  if (!list[index]) {
    throw new HarpoonError(ErrorCode.itemNotFound);
  }

  return list[index];
}
