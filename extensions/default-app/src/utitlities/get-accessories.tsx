import { List } from "@raycast/api";
import { UniformType } from "../types/uniform-type";

export function getAccessories(uniformType: UniformType): Array<List.Item.Accessory> {
  const accessories: Array<List.Item.Accessory> = [];

  accessories.push({
    icon: { fileIcon: uniformType.application.path },
    text: uniformType.application.name,
  });

  return accessories;
}
