import { App, AppList } from "../models";

export default function unshiftList(list: AppList, item: App): number {
  const stickyItems = new Array<[number, App]>();

  let availableIndex = 0;

  // We need to iterate backwards to avoid index shifting
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const currentItem = list[index];

    if (currentItem?.isSticky) {
      stickyItems.unshift([index, currentItem]);
      list.splice(index, 1);
    }
  }

  list.unshift(item);

  stickyItems.forEach(([index, item]) => {
    list.splice(index, 0, item);

    if (availableIndex === index) {
      availableIndex = index + 1;
    }
  });

  return availableIndex;
}
