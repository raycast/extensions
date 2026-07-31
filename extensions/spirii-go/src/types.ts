export type Location = {
  name: string;
  city: string;
  address: string;
  zipCode: string;
  id: string;
  coordinates: { latitude: number; longitude: number };
  power: { min: number; max: number };
  type: string;
  evseCount: number;
  available: number;
  isFavorite: boolean;
  isHome: boolean;
  platform: string;
};

export type PriceComponent = {
  type: string;
  price: number;
  step_size: number;
};

export type PriceRestrictions = {
  start_time?: string;
  end_time?: string;
  start_date?: string;
  end_date?: string;
};

export type PriceElement = {
  price_components: PriceComponent[];
  restrictions?: PriceRestrictions;
};

export type EvseSummary = {
  id: string;
  status: string;
  type: string;
  maxPower: number;
  pricing?: {
    amount: number;
    currency: string;
    unit: string;
    type: string;
  };
};

export type LocationDetail = {
  id: string;
  name: string;
  type: string;
  platform: string;
  address: string;
  coordinates: { lat: number; lon: number };
  operator?: { id: number; identifier: string; name: string };
  openingTimes?: { isTwentyFourSeven: boolean; isOpen: boolean };
  pricing?: { currency: string; isMobilePayAvailable: boolean };
  evse: EvseSummary[];
};

export type Evse = {
  evseId: string;
  locationId: string;
  maxPower: number;
  platform: string;
  status: string;
  type: string;
  price: {
    elements?: PriceElement[];
    isSpotPriceBased?: boolean;
    type?: string;
    perKwh?: number;
    currency?: string;
  };
};
