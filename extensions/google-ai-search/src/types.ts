// Shared types for the Google AI Search extension

export interface Source {
  title: string;
  url: string;
  snippet: string;
  displayUrl?: string;
}

export interface UserLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timestamp: number;
}

export interface AddressComponents {
  streetNumber?: string;
  streetName?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
}

export interface SearchIntent {
  isAddress: boolean;
  isLocation: boolean;
  hasExplicitLocation: boolean;
  enhancedWithLocation: boolean;
  isWeather: boolean;
  weatherLocation?: string;
  addressComponents?: AddressComponents;
}

export interface PlaceDetails {
  name?: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  website?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id?: string;
  photos?: Array<{
    photo_reference: string;
  }>;
  addressComponents?: AddressComponents;
}

export interface Preferences {
  googleCloudApiKey: string;
  model?: string;
  googleSearchEngineId?: string;
  googleMapsPlatformApiKey?: string;
}

export interface ConversationContext {
  originalQuery: string;
  previousResponse: string;
  sources: Source[];
  searchIntent: SearchIntent;
  timestamp: number;
}
