export type AstronautsResponse = {
  count: number;
  next: string;
  previous: string;
  results: Astronaut[];
};

export type Astronaut = {
  id: number;
  name: string;
  date_of_birth: string;
  time_in_space: string;
  profile_image_thumbnail: string;
  age: number;
  nationality: string;
  bio: string;
  flights_count: number;
  landings_count: number;
  spacewalks_count: number;
  first_flight: string;
  last_flight: string;
  agency: Agency;
};

type Agency = {
  id: number;
  name: string;
  abbrev: string;
  description: string;
  administrator: string;
  founding_year: string;
  launchers: string;
  spacecraft: string;
  country_code: string;
  social_media_url: string;
};
