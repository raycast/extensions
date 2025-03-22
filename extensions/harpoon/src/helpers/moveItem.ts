import HarpoonError, { ErrorCode } from "../HarpoonError";
import { App } from "../models";
import getList from "./getList";
import setList from "./setList";
import unshiftList from "./unshiftList";

export default async function moveItem(item: App, position: "first" | "last"): Promise<void> {
  const list = await getList();

  const index = list.findIndex(({ path }) => path === item.path);

  if (index === -1) {
    throw new HarpoonError(ErrorCode.itemNotFound);
  }

  const [targetItem] = list.splice(index, 1);

  if (position === "first") {
    unshiftList(list, targetItem);
  } else {
    list.push(targetItem);
  }

  await setList(list);
}
