import { Artist } from "./Artist";
import { Sets } from "./Sets";
import { Tour } from "./Tour";
import { Venue } from "./Venue";

export interface Setlist {
  id: string;
  versionId: string;
  eventDate: string;
  lastUpdated: string;
  artist: Artist;
  venue: Venue;
  tour?: Tour;
  sets: Sets;
  url: string;
  info?: string;
}
