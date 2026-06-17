import { LocalStorage } from "@raycast/api";
import HarpoonError, { ErrorCode } from "../HarpoonError";
import { AppList } from "../models";

export default async function setList(list: AppList): Promise<void> {
  await LocalStorage.setItem("defaultList", JSON.stringify(list)).catch(() => {
    throw new HarpoonError(ErrorCode.unableToSetList);
  });
}
