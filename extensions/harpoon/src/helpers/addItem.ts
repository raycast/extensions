import { App } from "../models";
import getList from "./getList";
import setList from "./setList";
import unshiftList from "./unshiftList";

interface AddItemResult {
  didAddItem: boolean;
  index: number;
}

export default async function addItem(item: App, position: "first" | "last"): Promise<AddItemResult> {
  const list = await getList();

  const existingIndex = list.findIndex(({ path }) => path === item.path);

  if (existingIndex !== -1) {
    return {
      didAddItem: false,
      index: existingIndex,
    };
  }

  let index = list.length;

  if (position === "first") {
    index = unshiftList(list, item);
  } else {
    list.push(item);
  }

  await setList(list);

  return {
    didAddItem: true,
    index,
  };
}
