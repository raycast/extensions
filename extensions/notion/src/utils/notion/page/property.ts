import type { CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { Form } from "@raycast/api";
import { markdownToRichText } from "@tryfabric/martian";
import { subMinutes } from "date-fns";

import type { NotionObject, ReadablePropertyType } from "..";
import type { UnwrapRecord } from "../../types";
import { getLocalTimezone } from "../global";

type NotionProperties<T, TObject> = T extends { object: TObject; properties: infer U } ? U : never;
export type PageProperty = UnwrapRecord<NotionProperties<NotionObject, "page">>;

type PagePropertyValue = CreatePageParameters["properties"][string];

export function formValueToPropertyValue<T extends ReadablePropertyType>(
  type: T,
  formValue: FormValueForDatabaseProperty<T>,
): PagePropertyValue | undefined;
export function formValueToPropertyValue(
  ...[type, value]: {
    [T in ReadablePropertyType]: [type: T, value: FormValueForDatabaseProperty<T>];
  }[ReadablePropertyType]
): PagePropertyValue | undefined {
  switch (type) {
    case "title":
    case "rich_text":
      return formattedProperty(type, markdownToRichText(value));
    case "number":
      return formattedProperty(type, parseFloat(value));
    case "date": {
      if (!value) return;
      const time = subMinutes(new Date(value), new Date().getTimezoneOffset()).toISOString();
      if (Form.DatePicker.isFullDay(value)) {
        return formattedProperty(type, {
          start: time.split("T")[0],
        });
      } else {
        return formattedProperty(type, {
          start: time,
          time_zone: getLocalTimezone(),
        });
      }
    }
    case "select":
    case "status":
      return formattedProperty(type, { id: value });
    case "multi_select":
    case "relation":
    case "people":
      return formattedProperty(
        type,
        value.map((id) => ({ id })),
      );
    case "formula":
      return;
    case "checkbox":
      return formattedProperty(type, value);
    default:
      return formattedProperty(type, value);
  }
}

const formattedProperty = <T extends ReadablePropertyType, V>(type: T, value: V) =>
  ({ [type]: value }) as { [K in T]: V };

// prettier-ignore
type FormValueForDatabaseProperty<T extends ReadablePropertyType> =
        T extends "date" ? Date | null
      : T extends "checkbox" ? boolean
      : T extends "multi_select" | "relation" | "people" ? string[]
      : T extends "formula" ? null
      : string;
