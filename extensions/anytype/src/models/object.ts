import { Image } from "@raycast/api";
import {
  ObjectIcon,
  ObjectLayout,
  PropertyLinkWithValue,
  PropertyWithValue,
  RawPropertyWithValue,
  RawType,
  Type,
} from ".";

export enum BodyFormat {
  Markdown = "md",
  JSON = "json",
}

export interface CreateObjectRequest {
  name: string;
  icon: ObjectIcon;
  template_id: string;
  type_key: string;
  properties: PropertyLinkWithValue[];
  body: string; // TODO: rename to markdown?
}

export interface UpdateObjectRequest {
  name?: string;
  icon?: ObjectIcon;
  type_key?: string; // TODO: add support in forms
  properties?: PropertyLinkWithValue[];
  markdown?: string;
}

export interface RawSpaceObject {
  object: string;
  id: string;
  name: string;
  icon: ObjectIcon | null;
  type: RawType | null;
  snippet: string;
  layout: ObjectLayout;
  space_id: string;
  archived: boolean;
  properties: RawPropertyWithValue[];
}

export interface RawSpaceObjectWithBody extends RawSpaceObject {
  markdown: string;
}

export interface SpaceObject extends Omit<RawSpaceObject, "icon" | "type" | "properties"> {
  icon: Image.ImageLike;
  type: Type;
  properties: PropertyWithValue[];
}

export interface SpaceObjectWithBody extends Omit<RawSpaceObjectWithBody, "icon" | "type" | "properties"> {
  icon: Image.ImageLike;
  type: Type;
  properties: PropertyWithValue[];
}
