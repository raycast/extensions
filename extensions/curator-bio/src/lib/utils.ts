import { Item } from "./types";

export const toCapitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const getItemUserWorkaround = (item: Partial<Item>) => {
  const user = Array.isArray(item.user) ? item.user[0] : item.user;

  return user;
};
