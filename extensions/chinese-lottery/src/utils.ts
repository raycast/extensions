import { List } from "@raycast/api";
import { Lottery } from "./types";

export function getAccessories(item: Lottery) {
  const accessories = new Array<List.Item.Accessory>();

  item.haoma.map((icon) => {
    accessories.push({ icon });
  });

  return accessories;
}
