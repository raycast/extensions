import { Icon, Image } from "@raycast/api";

export const getIcon = (icon: Image.ImageLike) => {
  // if icon is a string, return the icon
  if (typeof icon === "string") {
    return icon;
  }
  // if icon is an object, return the source
  if ("source" in icon) {
    return { ...icon, source: Icon[icon.source as keyof typeof Icon] };
  }
  return icon;
};
