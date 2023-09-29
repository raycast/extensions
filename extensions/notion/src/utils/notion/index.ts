import { Color, Icon } from "@raycast/api";
import { Client } from "@notionhq/client";

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
  // colors obtained by using color picker on notion app
  const colorMapper: Record<string, Color.ColorLike> = {
    default: { light: "#E3E2E0", dark: "#373737" }, // AKA "light gray in an option"
    gray: { light: "#E3E2E0", dark: "#5A5A5A" },
    brown: { light: "#EEE0DB", dark: "#603B2D" },
    orange: { light: "#D6BEAC", dark: "#844C1D" },
    yellow: { light: "#FEECC7", dark: "#89632A" },
    green: { light: "#DBEDDB", dark: "#2B593F" },
    blue: { light: "#D4E4EE", dark: "#29456C" },
    purple: { light: "#E8DEED", dark: "#493064" },
    pink: { light: "#F4E0E9", dark: "#69314C" },
    red: { light: "#FFE2DE", dark: "#6E362F" },
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
