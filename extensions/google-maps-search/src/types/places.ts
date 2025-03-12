import { GeoLocation } from "./core";

/**
 * Interface for place opening hours
 */
export interface OpeningHours {
  weekdayText?: string[];
  isOpen?: boolean;
}

/**
 * Interface for place search results
 */
export interface PlaceSearchResult {
  placeId: string;
  name: string;
  address: string;
  location: GeoLocation;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  photoReference?: string;
  vicinity?: string;
  priceLevel?: number;
}

/**
 * Interface for place details
 */
export interface PlaceDetails extends PlaceSearchResult {
  phoneNumber?: string;
  website?: string;
  openingHours?: OpeningHours;
  reviews?: PlaceReview[];
  photos?: string[];
}

/**
 * Interface for place reviews
 */
export interface PlaceReview {
  authorName: string;
  rating: number;
  relativeTimeDescription: string;
  text: string;
  time: number;
}

/**
 * Interface for place type options
 */
export interface PlaceTypeOption {
  title: string;
  value: string;
  plural?: string; // Plural form of the title
}

/**
 * Available place types for Google Places API
 */
export const PLACE_TYPES: PlaceTypeOption[] = [
  { title: "Restaurant", value: "restaurant", plural: "Restaurants" },
  { title: "Cafe", value: "cafe", plural: "Cafes" },
  { title: "Bar", value: "bar", plural: "Bars" },
  { title: "Supermarket", value: "supermarket", plural: "Supermarkets" },
  { title: "Bakery", value: "bakery", plural: "Bakeries" },
  { title: "Bank", value: "bank", plural: "Banks" },
  { title: "Gas Station", value: "gas_station", plural: "Gas Stations" },
  { title: "Hospital", value: "hospital", plural: "Hospitals" },
  { title: "Pharmacy", value: "pharmacy", plural: "Pharmacies" },
  { title: "Park", value: "park", plural: "Parks" },
  { title: "Gym", value: "gym_or_health_club", plural: "Gyms" },
  { title: "School", value: "school", plural: "Schools" },
  { title: "Shopping Mall", value: "shopping_mall", plural: "Shopping Malls" },
  { title: "Movie Theater", value: "movie_theater", plural: "Movie Theaters" },
  { title: "Museum", value: "museum", plural: "Museums" },
  { title: "Hotel", value: "lodging", plural: "Hotels" },
  { title: "Post Office", value: "post_office", plural: "Post Offices" },
  { title: "Library", value: "library", plural: "Libraries" },
  { title: "Police", value: "police", plural: "Police Stations" },
  { title: "Airport", value: "airport", plural: "Airports" },
  { title: "Bus Station", value: "bus_station", plural: "Bus Stations" },
  { title: "Train Station", value: "train_station", plural: "Train Stations" },
  { title: "Subway Station", value: "subway_station", plural: "Subway Stations" },
  { title: "Tourist Attraction", value: "tourist_attraction", plural: "Tourist Attractions" },
];
