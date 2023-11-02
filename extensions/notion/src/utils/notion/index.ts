import { Client } from "@notionhq/client";
import { Color, Icon } from "@raycast/api";

import { UnwrapArray, UnwrapPromise } from "../types";

import { DatabaseProperty } from "./database/property";
import { PagePropertyType } from "./page";

export * from "./database";
export * from "./page";

export type NotionObject = UnwrapArray<UnwrapPromise<ReturnType<Client["search"]>>["results"]>;

export const _supportedPropTypes = [
  "title",
  "number",
  "rich_text",
  "url",
  "email",
  "phone_number",
  "date",
  "checkbox",
  "select",
  "multi_select",
  "formula",
  "people",
  "relation",
  "status",
] satisfies PagePropertyType["type"][];
export const supportedPropTypes: PagePropertyType["type"][] = _supportedPropTypes;

export * from "./user";

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

export function getPropertyIcon(property: DatabaseProperty | PagePropertyType) {
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
