import { getPreferenceValues } from "@raycast/api";
import { getObjectWithoutMappedProperties } from "../api";
import {
  BodyFormat,
  PropertyFormat,
  PropertyWithValue,
  RawSpaceObject,
  RawSpaceObjectWithBody,
  SortProperty,
  SpaceObject,
  SpaceObjectWithBody,
} from "../models";
import { bundledPropKeys, getIconWithFallback, propKeys } from "../utils";
import { mapTag } from "./properties";
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
        name:
          object.name?.trim() ||
          (object.snippet.includes("\n") ? `${object.snippet.split("\n")[0]}...` : object.snippet || "Untitled"),
        type: await mapType(object.type),
        properties: await Promise.all(
          (object.properties?.filter((property) => {
            if (sort === SortProperty.Name) {
              // When sorting by name, keep the 'LastModifiedDate' property for tooltip purposes
              return property.key === SortProperty.LastModifiedDate;
            }
            return (
              property.key === sort ||
              property.key === bundledPropKeys.source || // keep source to open bookmarks in browser
              property.key === propKeys.tag // keep tags for submenu and accessories
            );
          }) || []) as PropertyWithValue[],
        ),
      };
    }),
  );
}

/**
 * Map raw `SpaceObject` item into display-ready data, including details, icons, etc.
 */
export async function mapObject(
  object: RawSpaceObject | RawSpaceObjectWithBody,
): Promise<SpaceObject | SpaceObjectWithBody> {
  const icon = await getIconWithFallback(object.icon, object.layout, object.type);

  const mappedProperties = await Promise.all(
    (object.properties || []).map(async (property) => {
      let mappedProperty: PropertyWithValue = {
        id: property.id,
        key: property.key,
        name: property.name || "Untitled",
        format: property.format,
      };

      switch (property.format) {
        case PropertyFormat.Text:
          mappedProperty = {
            ...mappedProperty,
            text: typeof property.text === "string" ? property.text.trim() : "",
          };
          break;
        case PropertyFormat.Number:
          mappedProperty = {
            ...mappedProperty,
            number: property.number !== undefined && property.number !== null ? property.number : 0,
          };
          break;
        case PropertyFormat.Select:
          if (property.select) {
            mappedProperty = {
              ...mappedProperty,
              select: mapTag(property.select),
            };
          }
          break;
        case PropertyFormat.MultiSelect:
          if (property.multi_select) {
            mappedProperty = {
              ...mappedProperty,
              multi_select: property.multi_select.map((tag) => mapTag(tag)),
            };
          }
          break;
        case PropertyFormat.Date:
          mappedProperty = {
            ...mappedProperty,
            date: property.date ? new Date(property.date).toISOString() : "",
          };
          break;
        case PropertyFormat.Files:
          if (property.files) {
            mappedProperty = {
              ...mappedProperty,
              files: await mapObjectWithoutProperties(object.space_id, property.files),
            };
          }
          break;
        case PropertyFormat.Checkbox:
          mappedProperty = {
            ...mappedProperty,
            checkbox: property.checkbox || false,
          };
          break;
        case PropertyFormat.Url:
          mappedProperty = {
            ...mappedProperty,
            url: typeof property.url === "string" ? property.url.trim() : "",
          };
          break;
        case PropertyFormat.Email:
          mappedProperty = {
            ...mappedProperty,
            email: typeof property.email === "string" ? property.email.trim() : "",
          };
          break;
        case PropertyFormat.Phone:
          mappedProperty = {
            ...mappedProperty,
            phone: typeof property.phone === "string" ? property.phone.trim() : "",
          };
          break;
        case PropertyFormat.Objects:
          if (property.objects) {
            mappedProperty = {
              ...mappedProperty,
              objects: await mapObjectWithoutProperties(object.space_id, property.objects),
            };
          }
          break;
        default:
          console.warn(`Unknown property format: '${property.format}' for property '${property.key}'`);
      }

      return mappedProperty;
    }),
  );

  return {
    ...object,
    icon,
    name:
      object.name?.trim() ||
      (object.snippet.includes("\n") ? `${object.snippet.split("\n")[0]}...` : object.snippet || "Untitled"),
    type: await mapType(object.type),
    properties: mappedProperties,
  };
}

export async function mapObjectWithoutProperties(spaceId: string, object: string[]): Promise<SpaceObject[]> {
  const rawItems = Array.isArray(object) ? object : [object];
  return await Promise.all(
    rawItems.map(async (item) => {
      if (typeof item === "string") {
        return await getObjectWithoutMappedProperties(spaceId, item, BodyFormat.Markdown);
      } else {
        return item;
      }
    }),
  );
}
