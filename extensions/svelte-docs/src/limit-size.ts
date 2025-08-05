import { ResponseType } from "./schema";

const SIZE_LIMIT = 400_000;

export function limit_size(
  items?: Array<Omit<NonNullable<ResponseType>["blocks"][number], "breadcrumbs"> & { breadcrumbs: string }>,
) {
  if (!items) return [];
  let current_size = JSON.stringify(items).length;
  while (current_size > SIZE_LIMIT) {
    const removed = items.pop();
    current_size -= JSON.stringify(removed).length;
  }
  return items;
}
