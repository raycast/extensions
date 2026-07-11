export interface University {
  name: string;
  domains: string[];
  country: string;
  web_pages: string[];
  alpha_two_code: string;
}

export interface GeoPos {
  place_id: number;
  licence: string;
  powered_by: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}
