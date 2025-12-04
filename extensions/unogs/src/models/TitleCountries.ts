export interface TitleCountry {
  country_code: string;
  country: string;
  season_details: string;
  new_date: string;
  audio: string;
  subtitle: string;
}

export interface TitleCountries {
  Object: { total: number; limit: number; offset: number };
  results: TitleCountry[];
}
