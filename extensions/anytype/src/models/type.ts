import { Image } from "@raycast/api";
import { ObjectIcon } from ".";

export interface RawType {
  object: string;
  id: string;
  key: string;
  name: string;
  icon: ObjectIcon;
  recommended_layout: string;
  archived: boolean;
}

export interface Type extends Omit<RawType, "icon"> {
  icon: Image.ImageLike;
}
