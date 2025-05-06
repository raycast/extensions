import { Image } from "@raycast/api";
import {
  ObjectIcon,
  ObjectLayout,
  PropertyLinkWithValue,
  PropertyWithValue,
  RawProperty,
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
  body: string;
  template_id: string;
  type_key: string;
  properties: PropertyLinkWithValue[];
}

export interface UpdateObjectRequest {
  name?: string;
  icon?: ObjectIcon;
  properties?: PropertyLinkWithValue[];
}

export interface RawSpaceObject {
  object: string;
  id: string;
  name: string;
  icon: ObjectIcon;
  type: RawType;
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
  type: Type;
  icon: Image.ImageLike;
  properties: PropertyWithValue[];
}

export interface Block {
  id: string;
  children_ids: string[];
  background_color: string;
  align: string;
  vertical_align: string;
  text: Text;
  file: File;
  property: RawProperty;
}

export interface Text {
  text: string;
  style: string;
  checked: boolean;
  color: string;
  icon: ObjectIcon;
}

export interface File {
  hash: string;
  name: string;
  type: string;
  mime: string;
  size: number;
  added_at: number;
  target_object_id: string;
  state: string;
  style: string;
}
