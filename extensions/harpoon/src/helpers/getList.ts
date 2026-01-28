import { LocalStorage } from "@raycast/api";
import HarpoonError, { ErrorCode } from "../HarpoonError";
import { AppList } from "../models";

export default async function getList(): Promise<AppList> {
  const list = await LocalStorage.getItem<string>("defaultList").catch(() => {
    throw new HarpoonError(ErrorCode.unableToGetList);
  });

  return list ? JSON.parse(list) : [];
}
