import { getPreferenceValues } from "@raycast/api";
import { getObjectWithoutMappedDetails } from "../api";
import { Property, RawSpaceObject, SortProperty, SpaceObject } from "../models";
import { colorMap, getIconWithFallback, typeIsList } from "../utils";
import { mapType } from "./types";

/**
 * Efficiently map raw `SpaceObject` items to essential display-ready data.
 * Only includes necessary fields for list rendering for performance.
 */
export async function mapObjects(objects: RawSpaceObject[]): Promise<SpaceObject[]> {
  const { sort } = getPreferenceValues();

  return Promise.all(
    objects.map(async (object) => {
      return {
        ...object,
        icon: await getIconWithFallback(object.icon, object.layout, object.type),
        name: object.name || object.snippet || "Untitled",
        type: await mapType(object.type),
        blocks: typeIsList(object.type.recommended_layout) ? object.blocks : [], // remove blocks for non-list types
        properties: object.properties?.filter((property) => {
          if (sort === SortProperty.Name) {
            // When sorting by name, keep the 'LastModifiedDate' property for tooltip purposes
            return property.id === SortProperty.LastModifiedDate;
          }
          return property.id === sort;
        }),
      };
    }),
  );
}

/**
 * Map raw `SpaceObject` item into display-ready data, including details, icons, etc.
 */
export async function mapObject(object: RawSpaceObject): Promise<SpaceObject> {
  const icon = await getIconWithFallback(object.icon, object.layout, object.type);

  const mappedProperties = await Promise.all(
    (object.properties || []).map(async (property) => {
      let mappedProperty: Property = {
        id: property.id,
        name: property.name,
        format: property.format,
      };

      switch (property.format) {
        case "text":
          mappedProperty = {
            ...mappedProperty,
            text: typeof property.text === "string" ? property.text.trim() : "",
          };
          break;
        case "number":
          mappedProperty = {
            ...mappedProperty,
            number: property.number !== undefined && property.number !== null ? property.number : 0,
          };
          break;
        case "select":
          if (property.select) {
            mappedProperty = {
              ...mappedProperty,
              select: {
                id: property.select.id || "",
                name: property.select.name || "",
                color: colorMap[property.select.color] || property.select.color,
              },
            };
          }
          break;
        case "multi_select":
          if (property.multi_select) {
            mappedProperty = {
              ...mappedProperty,
              multi_select: property.multi_select.map((tag) => ({
                id: tag.id || "",
                name: tag.name || "",
                color: colorMap[tag.color] || tag.color,
              })),
            };
          }
          break;
        case "date":
          mappedProperty = {
            ...mappedProperty,
            date: property.date ? new Date(property.date).toISOString() : "",
          };
          break;
        case "file":
          if (property.file) {
            mappedProperty = {
              ...mappedProperty,
              file: await mapObjectWithoutDetails(object.space_id, property.file),
            };
          }
          break;
        case "checkbox":
          mappedProperty = {
            ...mappedProperty,
            checkbox: property.checkbox || false,
          };
          break;
        case "url":
          mappedProperty = {
            ...mappedProperty,
            url: typeof property.url === "string" ? property.url.trim() : "",
          };
          break;
        case "email":
          mappedProperty = {
            ...mappedProperty,
            email: typeof property.email === "string" ? property.email.trim() : "",
          };
          break;
        case "phone":
          mappedProperty = {
            ...mappedProperty,
            phone: typeof property.phone === "string" ? property.phone.trim() : "",
          };
          break;
        case "object":
          if (property.object) {
            mappedProperty = {
              ...mappedProperty,
              object: await mapObjectWithoutDetails(object.space_id, property.object),
            };
          }
          break;
        default:
          console.warn(`Unknown property format: ${property.format}`);
      }

      return mappedProperty;
    }),
  );

  return {
    ...object,
    icon,
    name: object.name || object.snippet || "Untitled",
    type: await mapType(object.type),
    blocks: typeIsList(object.type.recommended_layout) ? object.blocks : [], // remove blocks for non-list types
    properties: mappedProperties,
  };
}

export async function mapObjectWithoutDetails(spaceId: string, object: SpaceObject[]): Promise<SpaceObject[]> {
  const rawItems = Array.isArray(object) ? object : [object];
  return await Promise.all(
    rawItems.map(async (item) => {
      if (typeof item === "string") {
        const fetched = await getObjectWithoutMappedDetails(spaceId, item);
        if (!fetched) {
          throw new Error(`getRawObject returned null for item ${item}`);
        }
        return fetched;
      } else {
        return item;
      }
    }),
  );
}
