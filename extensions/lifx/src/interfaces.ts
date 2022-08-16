export namespace Lights {
  export interface Color {
    hue: number;
    saturation: number;
    kelvin: number;
  }

  export interface Group {
    id: string;
    name: string;
  }

  export interface Location {
    id: string;
    name: string;
  }

  export interface Capabilities {
    has_color: boolean;
    has_variable_color_temp: boolean;
    has_ir: boolean;
    has_chain: boolean;
    has_multizone: boolean;
    min_kelvin: number;
    max_kelvin: number;
  }

  export interface Product {
    name: string;
    identifier: string;
    company: string;
    capabilities: Capabilities;
    product_id: number;
    vendor_id: number;
  }

  export interface Light {
    id: string;
    uuid: string;
    label: string;
    connected: boolean;
    power: string;
    color: Color;
    brightness: number;
    effect: string;
    group: Group;
    location: Location;
    product: Product;
    last_seen: Date;
    seconds_since_seen: number;
  }
}
