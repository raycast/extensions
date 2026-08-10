export interface Coordinates {
  longitude?: string | null;
  latitude?: string | null;
}

export interface ShippingInfo {
  shipper_address: Address;
  recipient_address: Address;
}

export interface LatestStatus {
  status: string;
  sub_status: string;
  sub_status_descr: string | null;
}

export interface Address {
  country?: string | null;
  state?: string | null;
  city?: string | null;
  street?: string | null;
  postal_code?: string | null;
  coordinates?: Coordinates;
}

export interface EstimatedDeliveryDate {
  from: string | null;
  to: string | null;
}

export interface TimeMetrics {
  days_after_order: number;
  days_of_transit: number;
  days_of_transit_done: number;
  days_after_last_update: number;
  estimated_delivery_date: EstimatedDeliveryDate;
}

export interface Milestone {
  key_stage: string;
  time_iso: string | null;
  time_utc: string | null;
}

export interface MilestoneEvent {
  key_stage: string;
  time_iso: string;
  time_utc: string;
}

export interface MiscInfo {
  risk_factor: number;
  service_type: string | null;
  weight_raw: string | null;
  weight_kg: string | null;
  pieces: string | null;
  dimensions: string | null;
  customer_number: string | null;
  reference_number?: string | null;
  local_number: string | null;
  local_provider: string | null;
  local_key?: number;
}

export interface Event {
  time_iso: string;
  time_utc: string;
  description: string;
  location: string | null;
  stage: string;
  address: Address;
}

export interface Provider {
  provider: {
    key: number;
    name: string;
    alias: string;
    tel?: string;
    homepage: string;
    country: string;
  };
  service_type: string | null;
  latest_sync_status: string;
  latest_sync_time: string;
  events_hash: number;
  events: Event[];
}

export interface Tracking {
  providers_hash: number;
  providers: Provider[];
}

export interface TrackInfo {
  shipping_info: ShippingInfo;
  latest_status: LatestStatus;
  latest_event: Event;
  time_metrics: TimeMetrics;
  milestone: Milestone[];
  misc_info: MiscInfo;
  tracking: Tracking;
}

export interface Accepted {
  number: string;
  carrier: number;
  param: string | null;
  tag: string | null;
  track_info: TrackInfo;
}

export interface Errors {
  code: number;
  message: string;
}

export interface IRejected {
  number: string;
  error: Errors;
}

export interface Data {
  accepted: Accepted[];
  rejected: IRejected[];
  errors?: Errors[];
}

export interface IResponse {
  code: number;
  data: Data;
}
