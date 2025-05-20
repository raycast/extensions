import { RawType, Type } from "../models";
import { getIconWithFallback } from "../utils";

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
export async function mapType(type: RawType): Promise<Type> {
  const icon = await getIconWithFallback(type.icon, "type");

  return {
    ...type,
    name: type.name?.trim() || "Untitled", // empty string comes as \n
    plural_name: type.plural_name?.trim() || "Untitled",
    icon: icon,
  };
}
