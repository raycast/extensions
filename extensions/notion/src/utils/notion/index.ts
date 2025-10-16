import { Client } from "@notionhq/client";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { Color, Icon } from "@raycast/api";

import { UnwrapArray, UnwrapPromise } from "../types";

import { DatabaseProperty } from "./database/property";
import { PageProperty } from "./page";

export * from "./database";
export * from "./page";
export * from "./user";

export type NotionObject = UnwrapArray<UnwrapPromise<ReturnType<Client["search"]>>["results"]>;

type Markdown = string;
export type PageContent = Markdown | BlockObjectRequest[];
export function isMarkdownPageContent(content: PageContent): content is Markdown {
  return typeof content === "string";
}

// prettier-ignore
const readablePropertyTypes = ["title", "number", "rich_text", "url", "email", "phone_number", "date", "checkbox", "select", "multi_select", "formula", "people", "relation", "status"] as const
export type ReadablePropertyType = (typeof readablePropertyTypes)[number];
export function isReadableProperty<T extends { type: PageProperty["type"] }>(
  property: T,
): property is Extract<T, { type: ReadablePropertyType }> {
  return (readablePropertyTypes as readonly string[]).includes(property.type);
}
export function isType<P extends DatabaseProperty | PageProperty, T extends PageProperty["type"]>(
  property: DatabaseProperty | PageProperty,
  ...types: T[]
): property is Extract<P, { type: T }> {
  return types.includes(property.type as T);
}

export function notionColorToTintColor(notionColor: string | undefined): Color.ColorLike {
  // ordered by appearance in option configuration
  // colors obtained by inspecting the notion app
  // default for light mode is a RGBA, but the background is #FFFFFF, so color was manually converted to RGB
  const colorMapper: Record<string, Color.ColorLike> = {
    default: { light: "#F1F0F0", dark: "#373737" }, // AKA "light gray in an option"
    gray: { light: "#E3E2E0", dark: "#5A5A5A" },
    brown: { light: "#EEE0DA", dark: "#603B2C" },
    orange: { light: "#FADEC9", dark: "#854C1D" },
    yellow: { light: "#FDECC8", dark: "#89632A" },
    green: { light: "#DBEDDB", dark: "#2B593F" },
    blue: { light: "#D3E5EF", dark: "#28456C" },
    purple: { light: "#E8DEEE", dark: "#492F64" },
    pink: { light: "#F5E0E9", dark: "#69314C" },
    red: { light: "#FFE2DD", dark: "#6E3630" },
  };

  return notionColor ? colorMapper[notionColor] : colorMapper["default"];
}

export function getPropertyIcon(property: DatabaseProperty | PageProperty) {
  switch (property.type) {
    case "checkbox":
      return Icon.Circle;
    case "date":
      return Icon.Calendar;
    case "email":
      return Icon.Envelope;
    case "files":
      return Icon.Paperclip;
    case "formula":
      return "./icon/formula.png";
    case "select":
    case "multi_select":
      return Icon.BulletPoints;
    case "number":
      return Icon.Hashtag;
    case "people":
      return Icon.Person;
    case "phone_number":
      return Icon.Phone;
    case "relation":
      return Icon.ArrowNe;
    case "rich_text":
      return Icon.Paragraph;
    case "rollup":
      return Icon.MagnifyingGlass;
    case "title":
      return Icon.Text;
    case "url":
      return Icon.Link;
    case "status":
      return "./icon/kanban_status_backlog.png";
    default:
      return Icon.QuestionMark;
  }
}
