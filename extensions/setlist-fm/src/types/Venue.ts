import { City } from "./City";

export interface Venue {
  id: string;
  name: string;
  city: City;
  url: string;
}
