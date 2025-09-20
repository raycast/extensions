import { Artist } from "./Artist";

export interface SearchArtistsResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  artist: Artist[];
}
