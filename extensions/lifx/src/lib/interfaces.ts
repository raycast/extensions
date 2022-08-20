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

export interface Color {
  hue: number;
  saturation: number;
  kelvin: number;
}

export namespace Api {
  export interface lightStateParam {
    power?: string;
    color?: string;
    brightness?: number;
    duration?: number;
    infrared?: number;
    fast?: boolean;
  }

  export interface lightStateResult {
    results: result[];
  }

  export interface result {
    id: string;
    label: string;
    status: string;
  }

  export interface Error {
    error: string;
    errors: Error[];
  }

  export interface errorItem {
    field: string;
    message: string[];
  }

  export interface toggleLight {
    duration: number;
  }

  export interface Scene {
    uuid: string;
    name: string;
    account: Account;
    states: State[];
    created_at: number;
    updated_at: number;
  }

  export interface Account {
    uuid: string;
  }

  export interface State {
    brightness?: number;
    selector: string;
    color?: Color;
  }

  export interface cleanParams {
    stop?: boolean;
    duration?: number;
  }

  export interface sceneParams {
    duration?: number;
    ignore?: string[];
    overides?: lightStateParam;
    fast?: boolean;
  }
}

export interface CssColor {
  name: string;
  value: string;
}
