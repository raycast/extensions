import { Image } from "@raycast/api";
import { ObjectIcon, PropertyLink, RawProperty } from ".";

export enum TypeLayout {
  Basic = "basic",
  Profile = "profile",
  Action = "action",
  Note = "note",
}

export enum ObjectLayout {
  Basic = "basic",
  Profile = "profile",
  Action = "action",
  Note = "note",
  Bookmark = "bookmark",
  Set = "set",
  Collection = "collection",
  Participant = "participant",
}

export interface CreateTypeRequest {
  key?: string;
  name: string;
  plural_name: string;
  icon: ObjectIcon;
  layout: TypeLayout;
  properties: PropertyLink[];
}

export interface UpdateTypeRequest {
  key?: string;
  name?: string;
  plural_name?: string;
  icon?: ObjectIcon;
  layout?: TypeLayout;
  properties?: PropertyLink[];
}

export interface RawType {
  object: string;
  id: string;
  key: string;
  name: string;
  plural_name: string;
  icon: ObjectIcon;
  layout: ObjectLayout;
  archived: boolean;
  properties: RawProperty[];
}

export interface Type extends Omit<RawType, "icon"> {
  icon: Image.ImageLike;
}
