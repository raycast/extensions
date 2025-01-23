import { Icon } from "@raycast/api";
import { Type } from "../schemas";

/**
 * Map raw `Type` objects from the API into display-ready data (e.g., icon).
 */
export async function mapTypes(types: Type[]): Promise<Type[]> {
  return Promise.all(
    types.map(async (type) => {
      return {
        ...type,
        icon: type.icon || Icon.Lowercase,
      };
    }),
  );
}
