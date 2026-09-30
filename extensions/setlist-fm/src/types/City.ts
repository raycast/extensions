import { Coords } from "./Coords";
import { Country } from "./Country";

export interface City {
  id: string;
  name: string;
  state?: string;
  stateCode?: string;
  coords: Coords;
  country: Country;
}
