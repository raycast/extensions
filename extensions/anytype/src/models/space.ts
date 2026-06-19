import { Image } from "@raycast/api";
import { ObjectIcon } from ".";

export interface CreateSpaceRequest {
  name: string;
  description: string;
}

export interface UpdateSpaceRequest {
  name?: string;
  description?: string;
}

export interface RawSpace {
  object: "anytype.space" | "anytype.onetoone" | "anytype.chatspace";
  id: string;
  name: string;
  icon: ObjectIcon | null;
  description: string;
  gateway_url: string;
  network_id: string;
}

export interface Space extends Omit<RawSpace, "icon" | "object"> {
  object: "space" | "chat";
  icon: Image.ImageLike;
}
