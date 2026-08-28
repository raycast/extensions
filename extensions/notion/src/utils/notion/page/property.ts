import type { PageObjectResponse, CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { Form } from "@raycast/api";
import { markdownToRichText } from "@tryfabric/martian";
import { subMinutes } from "date-fns";

import type { ReadablePropertyType } from "..";
import { getLocalTimezone } from "../global";
import type { Standardized } from "../standardize";

export type PageProperty = Standardized<PageObjectResponse["properties"][string], "value">;

type PagePropertyValue = NonNullable<CreatePageParameters["properties"]>[string];

export function formValueToPropertyValue<T extends ReadablePropertyType>(
  type: T,
  formValue: FormValueForDatabaseProperty<T>,
): PagePropertyValue | undefined;
export function formValueToPropertyValue(
  ...[type, value]: {
    [T in ReadablePropertyType]: [type: T, value: FormValueForDatabaseProperty<T>];
  }[ReadablePropertyType]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  switch (type) {
    case "title":
      return { title: markdownToRichText(value) };
    case "rich_text":
      return { rich_text: markdownToRichText(value) };
    case "number":
      return { number: parseFloat(value) };
    case "date": {
      if (!value) return;
      const time = subMinutes(new Date(value), new Date().getTimezoneOffset()).toISOString();
      if (Form.DatePicker.isFullDay(value)) {
        return { date: { start: time.split("T")[0] } };
      } else {
        return { date: { start: time, time_zone: getLocalTimezone() } };
      }
    }
    case "select":
      return { select: { id: value } };
    case "status":
      return { status: { id: value } };
    case "multi_select":
      return { multi_select: value.map((id) => ({ id })) };
    case "relation":
      return { relation: value.map((id) => ({ id })) };
    case "people":
      return { people: value.map((id) => ({ id })) };
    case "checkbox":
      return { checkbox: value };
    case "url":
      return { url: value };
    case "email":
      return { email: value };
    case "phone_number":
      return { phone_number: value };
    case "formula":
      return;
  }
}

// prettier-ignore
export type FormValueForDatabaseProperty<T extends ReadablePropertyType> =
        T extends "date" ? Date | null
      : T extends "checkbox" ? boolean
      : T extends "multi_select" | "relation" | "people" ? string[]
      : T extends "formula" ? null
      : string;
