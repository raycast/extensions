import { Color } from ".";

export interface CreateTagRequest {
  key?: string;
  name: string;
  color: Color;
}

export interface UpdateTagRequest {
  key: string;
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
