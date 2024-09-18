interface Spec {
  code: string;
  endDate: string;
  isActive: boolean;
  colorCode: string;
  displayName: string;
}

export interface Vehicle {
  id: number;
  user_id: number;
  tesla_account_id: number;
  vehicle_id: number;
  special_vehicle_id: number;
  public_id: string;
  vin: string;
  name: string;
  state: string;
  api_version: number;
  primary: number;
  logging: number;
  version_logging: number;
  idle_override: number;
  recent_override: number;
  free_supercharging: number;
  fsd_enabled: number;
  eap_enabled: number;
  ap_enabled: number;
  calculate_cost: number;
  allow_unlocking: number;
  shared_override: number;
  billing_day: number;
  private: number;
  controls: number;
  dashboard_type: number;
  country: string;
  restful: number;
  sleep_start_at: null | string;
  sleep_end_at: null | string;
  ready: number;
  co2_saved: number;
  trees_planted: number;
  safety_logging: number;
  specs: Spec[];
  created_at: string;
  updated_at: string;
  recently_updated_at: string;
  image_url: null | string;
  recently_driven_at: string;
  recently_charged_at: string;
  odometer: string;
  fleet_enabled: number;
  forced_sentry: number;
}
