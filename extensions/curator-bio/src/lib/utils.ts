import { Item } from "./types";

export const getItemUserWorkaround = (item: Partial<Item>) => {
  const user = Array.isArray(item.user) ? item.user[0] : item.user;

  return user;
};
