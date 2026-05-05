import HarpoonError, { ErrorCode } from "../HarpoonError";
import getList from "./getList";
import setList from "./setList";
import unshiftList from "./unshiftList";

export default async function moveItem(index: number, position: "first" | "last"): Promise<void> {
  const list = await getList();

  const [targetItem] = list.splice(index, 1);

  if (!targetItem) {
    throw new HarpoonError(ErrorCode.itemNotFound);
  }

  if (position === "first") {
    unshiftList(list, targetItem);
  } else {
    list.push(targetItem);
  }

  await setList(list);
}
