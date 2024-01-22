import { get } from "./togglClient";

export function getMyTags() {
  return get<Tag[]>("/me/tags");
}

// https://developers.track.toggl.com/docs/api/tags#response
export interface Tag {
  id: number;
  name: string;
  workspace_id: number;
}
