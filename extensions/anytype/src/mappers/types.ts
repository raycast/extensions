import { Icon } from "@raycast/api";
import { Type } from "../helpers/schemas";

/**
 * Map raw `Type` objects from the API into display-ready data (e.g., icon).
 */
export async function mapTypes(types: Type[]): Promise<Type[]> {
  return Promise.all(
    types.map(async (type) => {
      return {
        ...type,
        name: type.name.trim() || "Untitled", // empty string comes as \n
        icon: type.icon || Icon.Lowercase,
      };
    }),
  );
}
