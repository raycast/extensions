import { get } from "./togglClient";

export function getMyOrganizations() {
  return get<Organization[]>("/me/organizations");
}

// https://developers.track.toggl.com/docs/api/organizations#200-1
export interface Organization {
  id: number;
  name: string;
  admin: boolean;
  owner: boolean;
}
