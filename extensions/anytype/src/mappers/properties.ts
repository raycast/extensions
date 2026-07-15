import { Image } from "@raycast/api";
import { Property, PropertyFormat, RawProperty, RawTag, Tag } from "../models";
import { colorToHex, getNameWithFallback } from "../utils";

export function mapProperties(properties: RawProperty[]): Property[] {
  return properties.map((property) => {
    return mapProperty(property);
  });
}

export function mapProperty(property: RawProperty): Property {
  return {
    ...property,
    name: getNameWithFallback(property.name),
    icon: getIconForProperty(property.format),
  };
}

export function getIconForProperty(format: PropertyFormat): Image.ImageLike {
  const tintColor = { light: "grey", dark: "grey" };
  switch (format) {
    case PropertyFormat.Text:
      return { source: "icons/property/text.svg", tintColor: tintColor };
    case PropertyFormat.Number:
      return { source: "icons/property/number.svg", tintColor: tintColor };
    case PropertyFormat.Select:
      return { source: "icons/property/select.svg", tintColor: tintColor };
    case PropertyFormat.MultiSelect:
      return { source: "icons/property/multi_select.svg", tintColor: tintColor };
    case PropertyFormat.Date:
      return { source: "icons/property/date.svg", tintColor: tintColor };
    case PropertyFormat.Files:
      return { source: "icons/property/files.svg", tintColor: tintColor };
    case PropertyFormat.Checkbox:
      return { source: "icons/property/checkbox.svg", tintColor: tintColor };
    case PropertyFormat.Url:
      return { source: "icons/property/url.svg", tintColor: tintColor };
    case PropertyFormat.Email:
      return { source: "icons/property/email.svg", tintColor: tintColor };
    case PropertyFormat.Phone:
      return { source: "icons/property/phone.svg", tintColor: tintColor };
    case PropertyFormat.Objects:
      return { source: "icons/property/objects.svg", tintColor: tintColor };
  }
}

export function mapTags(tags: RawTag[]): Tag[] {
  return tags.map((tag) => {
    return mapTag(tag);
  });
}

export function mapTag(tag: RawTag): Tag {
  return {
    ...tag,
    name: getNameWithFallback(tag.name),
    color: colorToHex[tag.color] || tag.color,
  };
}
