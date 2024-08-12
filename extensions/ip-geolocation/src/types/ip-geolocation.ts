export interface IPGeolocation {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  district: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

export interface IPGeolocationReadable {
  IP: string; //query
  Location: string; //country  regionName city district
  GeoCoordinates: string; //(lat,lon) or (lon,lat)
  Timezone: string;
  AS: string;
  ISP: string; //isp
  Organization: string; //org
}
