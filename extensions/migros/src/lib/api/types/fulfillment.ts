// Fulfillment and cooperative types for the Migros API client

export interface CooperativeInfo {
  cooperative: string;
  zipCode: string;
  cityName: string;
}

export interface FulfillmentSelection {
  cooperative: string;
  warehouseId: number;
  inStoreZipCode: string;
  inStoreCityName: string;
  eComZipCode?: string;
  eComCityName?: string;
  deliverId?: string;
  deliveryRequestKey?: string;
  start?: string;
  end?: string;
  pickingStart?: string;
  isLocationGuessed?: boolean;
  isUsingAdvancedMode?: boolean;
  allowSpecialFresh?: boolean;
  isDefaultSlot?: boolean;
}
