import { SpaceObject, Detail, Member } from "../helpers/schemas";
import { getIconWithFallback } from "../helpers/icon";
import { getPreferenceValues } from "@raycast/api";

/**
 * Map raw `SpaceObject` item into display-ready data, including details, icons, etc.
 */
export async function mapObject(object: SpaceObject): Promise<SpaceObject> {
  const getDetail = (id: string): Detail["details"] | undefined =>
    object.details?.find((detail) => detail.id === id)?.details;

  // Resolve object icon
  const icon = await getIconWithFallback(object.icon, object.layout);

  // Extract 'created' details
  const createdDateString = getDetail("created_date")?.created_date as string;
  const createdDate = createdDateString ? new Date(createdDateString) : new Date(0);
  const createdByDetails = getDetail("created_by")?.details as Member;
  const createdBy = {
    name: createdByDetails?.name || "Unknown",
    icon: await getIconWithFallback(createdByDetails?.icon, "participant"),
    globalName: createdByDetails?.global_name || "",
  };

  // Extract 'last modified' details
  const lastModifiedDateString = getDetail("last_modified_date")?.last_modified_date as string;
  const lastModifiedDate = lastModifiedDateString ? new Date(lastModifiedDateString) : new Date(0);
  const lastModifiedByDetails = getDetail("last_modified_by")?.details as Member;
  const lastModifiedBy = {
    name: lastModifiedByDetails?.name || "Unknown",
    icon: await getIconWithFallback(lastModifiedByDetails?.icon, "participant"),
    globalName: lastModifiedByDetails?.global_name || "",
  };

  return {
    ...object,
    icon,
    blocks: undefined, // remove blocks to improve performance, as they're not used in the UI
    name: object.name || object.snippet || "Untitled",
    type: object.type || "Unknown Type",
    details: object.details.map((detail) => {
      const { id, details } = detail;

      return {
        ...detail,
        details: {
          ...details,
          ...(id === "created_date" && { created_date: createdDate.toISOString() }),
          ...(id === "created_by" && { createdBy }),
          ...(id === "last_modified_date" && { last_modified_date: lastModifiedDate.toISOString() }),
          ...(id === "last_modified_by" && { lastModifiedBy }),
        },
      };
    }),
  };
}

/**
 * Efficiently map raw `SpaceObject` items to essential display-ready data.
 * Only includes necessary fields for list rendering for performance.
 */
export async function mapObjects(objects: SpaceObject[]): Promise<SpaceObject[]> {
  return Promise.all(
    objects.map(async (object) => {
      return {
        ...object,
        icon: await getIconWithFallback(object.icon, object.layout),
        name: object.name || object.snippet || "Untitled",
        type: object.type || "Unknown Type",
        details: object.details?.filter((detail) => detail.id === getPreferenceValues().sort) || [],
      };
    }),
  );
}
