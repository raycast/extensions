import { Image } from "@raycast/api";
import { ObjectIcon } from ".";

export interface RawTemplate {
  object: string;
  id: string;
  name: string;
  icon: ObjectIcon;
}

export interface Template extends Omit<RawTemplate, "icon"> {
  icon: Image.ImageLike;
}
