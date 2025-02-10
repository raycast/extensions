/**
 * e.g.
 *   {
 *         "run_id": 9223370535861074807,
 *         "name": "Run from keep",
 *         "distance": 4424.313,
 *         "moving_time": "1:03:27",
 *         "type": "Run",
 *         "start_date": "2017-07-25 13:36:04",
 *         "start_date_local": "2017-07-25 21:36:04",
 *         "location_country": "",
 *         "summary_polyline": "",
 *         "average_heartrate": null,
 *         "average_speed": 1.1621520882584713,
 *         "streak": 1
 *     }
 */
export type Activity = {
  run_id: number;
  name: string;
  distance: number;
  moving_time: string;
  type: string;
  start_date: string;
  start_date_local: string;
  location_country: string | null;
  summary_polyline: string;
  average_heartrate: number;
  average_speed: number;
  streak: number;
  activity?: Activity;
};

export type LocationCountry = {
  latitude: number;
  longitude: number;
  country: string;
  nationCode: string;
  province: string;
  city: string;
  cityCode: string;
  district: string | "None";
  districtCode: string | "None";
};

export type GitHubResource = {
  name: string;
  html_url: string;
  download_url: string;
};
