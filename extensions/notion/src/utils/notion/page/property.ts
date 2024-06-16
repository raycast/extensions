import type { CreatePageParameters, RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
import { Form } from "@raycast/api";
import { markdownToRichText } from "@tryfabric/martian";
import { subMinutes } from "date-fns";

import type { NotionObject, WritablePropertyTypes } from "..";
import type { UnwrapRecord, ObjectValues } from "../../types";
import { getLocalTimezone } from "../global";

type NotionProperties<T, TObject> = T extends { object: TObject; properties: infer U } ? U : never;
export type PageProperty = UnwrapRecord<NotionProperties<NotionObject, "page">>;
export type WritablePageProperty = Extract<PageProperty, { type: WritablePropertyTypes }>;

type PagePropertyValue = CreatePageParameters["properties"][string];

export function formValueToPropertyValue<T extends WritablePropertyTypes>(
  type: T,
  formValue: FormValueForDatabaseProperty<T>,
): PagePropertyValue | undefined;
export function formValueToPropertyValue(
  ...[type, value]: {
    [T in WritablePropertyTypes]: [type: T, value: FormValueForDatabaseProperty<T>];
  }[WritablePropertyTypes]
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

const formattedProperty = <T extends WritablePropertyTypes, V>(type: T, value: V) =>
  ({ [type]: value }) as { [K in T]: V };

export function propertyValueToFormValue<T extends WritablePropertyTypes>(
  property: WritablePageProperty,
): FormValueForDatabaseProperty<T> | undefined;
export function propertyValueToFormValue(
  property: WritablePageProperty,
): FormValueForDatabaseProperty<WritablePropertyTypes> | undefined {
  switch (property.type) {
    case "title":
    case "rich_text":
      return getPropertyValue(property).map(richTextToMarkdown).join("");
    case "date": {
      const startDate = getPropertyValue(property)?.start;
      if (startDate !== undefined) return new Date(startDate);
      return;
    }
    case "select":
    case "status":
      return getPropertyValue(property)?.id;
    case "multi_select":
    case "relation":
    case "people":
      return getPropertyValue(property)?.map((opt) => opt.id);
    case "formula":
      return;
    case "number":
      return getPropertyValue(property)?.toString();
    default:
      return getPropertyValue(property);
  }
}

function getPropertyValue<T extends WritablePageProperty>(
  property: T,
): {
  [T in WritablePageProperty as T["type"]]: ObjectValues<Omit<T, keyof WritablePageProperty>>;
}[T["type"]] {
  // @ts-expect-error - Unable to a way to make union types and dynamic keys get along.
  return property[property.type];
}

function richTextToMarkdown(block: RichTextItemResponse) {
  if (block.type !== "text") return block.plain_text;
  let markdown = block.text.content;
  if (block.annotations.italic) markdown = `_${markdown}_`;
  if (block.annotations.bold) markdown = `**${markdown}**`;
  if (block.annotations.code) markdown = `\`${markdown}\``;
  if (block.annotations.strikethrough) markdown = `~~${markdown}~~`;
  if (block.text.link?.url) markdown = `[${markdown}](${block.text.link.url})`;
  return markdown;
}

// prettier-ignore
type FormValueForDatabaseProperty<T extends WritablePropertyTypes> =
        T extends "date" ? Date | null
      : T extends "checkbox" ? boolean
      : T extends "multi_select" | "relation" | "people" ? string[]
      : T extends "formula" ? null
      : string;
