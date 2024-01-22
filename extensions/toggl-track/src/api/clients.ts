import { get } from "./togglClient";

export function getMyClients() {
  return get<Client[]>("/me/clients");
}

// https://developers.track.toggl.com/docs/api/clients#response
export interface Client {
  id: number;
  name: string;
}
