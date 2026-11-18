import { Color, IconName, ObjectLayout, RawType, Type } from "../models";
import { getCustomTypeIcon, getIconWithFallback, getNameWithFallback } from "../utils";

/**
 * Map raw `Type` objects from the API into display-ready data (e.g., icon).
 */
export async function mapTypes(types: RawType[]): Promise<Type[]> {
  return Promise.all(
    types.map(async (type) => {
      return mapType(type);
    }),
  );
}

/**
 * Map raw `Type` object from the API into display-ready data (e.g., icon).
 */
export async function mapType(type: RawType | null): Promise<Type> {
  if (!type || !type.id) {
    return {
      object: "type",
      id: "",
      key: "",
      name: "Deleted Type",
      plural_name: "Deleted Types",
      icon: getCustomTypeIcon(IconName.Warning, Color.Red),
      layout: ObjectLayout.Basic,
      archived: false,
      properties: [],
    };
  }

  const icon = await getIconWithFallback(type.icon, "type");

  return {
    ...type,
    name: getNameWithFallback(type.name),
    plural_name: getNameWithFallback(type.plural_name),
    icon: icon,
  };
}
