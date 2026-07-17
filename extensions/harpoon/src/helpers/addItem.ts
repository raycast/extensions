import { App } from "../models";
import getList from "./getList";
import setList from "./setList";
import unshiftList from "./unshiftList";

interface AddItemResult {
  didAddItem: boolean;
  index: number;
}

export default async function addItem(item: App, position: "first" | "last" | number): Promise<AddItemResult> {
  const list = await getList();

  const existingIndex = list.findIndex((listItem) => listItem?.path === item.path);

  if (existingIndex !== -1 && typeof position === "string") {
    return {
      didAddItem: false,
      index: existingIndex,
    };
  }

  let index = list.length;

  if (position === "first") {
    index = unshiftList(list, item);
  } else if (position === "last") {
    list.push(item);
  } else {
    index = position - 1;

    if (index > list.length) {
      list.push(...Array(index - list.length).fill(null));
    }

    list[index] = item;
  }

  await setList(list);

  return {
    didAddItem: true,
    index,
  };
}
