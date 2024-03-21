import { Color, Icon, List } from "@raycast/api";
import { Season } from "../types/season.types";

const generateSeasonAccessories = (season: Season): List.Item.Accessory[] => {
  if (season.active) {
    return [{ icon: { source: Icon.CheckCircle, tintColor: Color.Green }, tooltip: "Active season" }];
  }

  if (!season.active) {
    return [{ icon: { source: Icon.XMarkCircle, tintColor: Color.Red }, tooltip: "No Active Season" }];
  }

  return [];
};

export default generateSeasonAccessories;
