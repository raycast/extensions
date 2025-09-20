import { Setlist } from "./Setlist";

export interface SearchSetlistResponse {
  type: string;
  itemsPerPage: number;
  page: number;
  total: number;
  setlist: Setlist[];
}
