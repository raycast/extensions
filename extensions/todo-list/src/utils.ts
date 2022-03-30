import { TodoItem } from "./atoms";
export const compare = (a: TodoItem, b: TodoItem) => {
  if (a.completed && !b.completed) return 1;
  if (b.completed && !a.completed) return -1;
  if (a.timeAdded < b.timeAdded) return -1;
  return 1;
};

export const insertIntoSection = (
  currentSection: TodoItem[],
  newItem: TodoItem,
  cmp: (a: TodoItem, b: TodoItem) => number
) => {
  let low = -1;
  let high = currentSection.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high + 1) / 2);
    if (cmp(newItem, currentSection[mid]) < 0) {
      high = mid - 1;
    } else {
      low = mid;
    }
  }
  currentSection.splice(low + 1, 0, newItem);
  return currentSection;
};
