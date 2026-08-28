import { RawSpace, Space } from "../models";
import { getIconWithFallback, getNameWithFallback } from "../utils";

/**
 * Map raw `Space` objects from the API into display-ready data (e.g., icon).
 * @param spaces Raw `Space` objects from the API.
 * @returns Display-ready `Space` objects.
 */
export async function mapSpaces(spaces: RawSpace[]): Promise<Space[]> {
  return Promise.all(
    spaces.map((space) => {
      return mapSpace(space);
    }),
  );
}

/**
 * Map raw `Space` object from the API into display-ready data (e.g., icon).
 * @param space Raw `Space` object from the API.
 * @returns Display-ready `Space` object.
 */
export async function mapSpace(space: RawSpace): Promise<Space> {
  // The API namespaces space kinds (e.g. "anytype.space", "anytype.onetoone", "anytype.chatspace");
  // normalize to the simple values the UI filters and icon fallback expect.
  const object = space.object === "anytype.onetoone" || space.object === "anytype.chatspace" ? "chat" : "space";
  const icon = await getIconWithFallback(space.icon, object);

  return {
    ...space,
    object,
    name: getNameWithFallback(space.name),
    icon,
  };
}
