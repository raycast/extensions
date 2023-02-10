import { DeviceCategories, DeviceCategory } from "./interfaces";

export const getCategory = (categories: DeviceCategory[], categoryCode: DeviceCategories): DeviceCategories => {
  const categoryInfo = categories.find((category) => category.code === categoryCode);
  if (categoryInfo) {
    return categoryInfo.name;
  }
  return categoryCode;
};
