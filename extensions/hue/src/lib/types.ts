// noinspection SpellCheckingInspection
// https://developers.meethue.com/develop/hue-api/

export type id = string | number;
export type XY = [number, number];

export interface CssColor {
  name: string;
  value: string;
}

export interface LightState {
  on: boolean;
  bri: number;
  hue: number;
  sat: number;
  xy: [number, number];
  ct: number;
  alert: "none" | "select" | "lselect";
  effect: "none" | "colorloop";
  colormode: "hs" | "xy" | "ct";
  reachable: boolean;
}

export interface Light {
  id: id;
  name: string;
  uniqueid: string;
  luminaireuniqueid: string;
  state: LightState;
}

export interface Group {
  id: id;
  name: string;
  lights: id[];
  sensors: id[];
  type: "Luminaire" | "Lightsource" | "LightGroup" | "Room" | "Entertainment" | "Zone";
  state: { all_on: boolean; any_on: boolean };
  action: LightState;
}

export interface Room extends Group {
  class:
    | "Living room"
    | "Kitchen"
    | "Dining"
    | "Bedroom"
    | "Kids bedroom"
    | "Bathroom"
    | "Nursery"
    | "Recreation"
    | "Office"
    | "Gym"
    | "Hallway"
    | "Toilet"
    | "Front door"
    | "Garage"
    | "Terrace"
    | "Garden"
    | "Driveway"
    | "Carport"
    | "Other"
    | "Home"
    | "Downstairs"
    | "Upstairs"
    | "Top floor"
    | "Attic"
    | "Guest room"
    | "Staircase"
    | "Lounge"
    | "Man cave"
    | "Computer"
    | "Studio"
    | "Music"
    | "TV"
    | "Reading"
    | "Closet"
    | "Storage"
    | "Laundry room"
    | "Balcony"
    | "Porch"
    | "Barbecue"
    | "Pool";
}

export interface Scene {
  id: string;
  name: string;
  type: "LightScene" | "GroupScene";
  group: id;
  lights: id[];
}
