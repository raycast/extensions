import { Artist } from "./Artist";

export interface Song {
  name?: string;
  tape?: boolean;
  cover?: Artist;
  info?: string;
}
