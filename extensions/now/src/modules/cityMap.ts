import cityTimezones = require("city-timezones");

export interface City {
  city: string;
  country: string;
  iso2: string;
  pop?: number;
  timezone: string;
  province?: string;
}

export default cityTimezones.cityMapping;
