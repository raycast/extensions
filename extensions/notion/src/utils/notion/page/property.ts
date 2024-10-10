import type { PageObjectResponse, CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { Form } from "@raycast/api";
import { markdownToRichText } from "@tryfabric/martian";
import { subMinutes } from "date-fns";

import type { ReadablePropertyType } from "..";
import { getLocalTimezone } from "../global";
import type { Standardized } from "../standardize";

export type PageProperty = Standardized<PageObjectResponse["properties"][string], "value">;

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
      return markdownToRichText(value);
    case "number":
      return parseFloat(value);
    case "date": {
      if (!value) return;
      const time = subMinutes(new Date(value), new Date().getTimezoneOffset()).toISOString();
      if (Form.DatePicker.isFullDay(value)) {
        return { start: time.split("T")[0] };
      } else {
        return { start: time, time_zone: getLocalTimezone() };
      }
    }
    case "select":
    case "status":
      return { id: value };
    case "multi_select":
    case "relation":
    case "people":
      return value.map((id) => ({ id }));
    case "formula":
      return;
    default:
      return value;
  }
}

// prettier-ignore
export type FormValueForDatabaseProperty<T extends ReadablePropertyType> =
        T extends "date" ? Date | null
      : T extends "checkbox" ? boolean
      : T extends "multi_select" | "relation" | "people" ? string[]
      : T extends "formula" ? null
      : string;
