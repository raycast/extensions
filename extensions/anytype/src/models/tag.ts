import { Color } from ".";

export interface CreateTagRequest {
  name: string;
  color: Color;
}

export interface UpdateTagRequest {
  name: string;
  color?: Color;
}

export interface RawTag {
  id: string;
  key: string;
  name: string;
  color: Color;
}

export interface Tag extends Omit<RawTag, "color"> {
  color: string;
}
