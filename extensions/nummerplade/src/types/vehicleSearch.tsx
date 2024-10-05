export type VehicleSearchResponse = {
  data: Vehicle;
  cost: number;
};

export type Vehicle = {
  id: number;
  registration: string;
  vin: string;
  first_registration_date: string;
  status: string;
  status_updated_at: string;
  registration_status: string;
  registration_status_updated_at: string;
  kind: string;
  usage: string;
  category: string | null;
  model_year: string | null;
  fuel_type: string;
  mileage: number;
  mileage_annual_average: number;
  brand_and_model: string;
  brand: string;
  brand_id: string;
  model: string;
  model_id: string;
  variant: string;
  variant_id: string;
  version: string;
  version_id: string;
  body_type: string;
  eu_version: string | null;
  eu_variant: string | null;
  ec_type_approval: string;
  last_inspection_date: string;
  last_inspection_result: string;
  last_inspection_kind: string;
  next_inspection_date_estimate: string;
  ncap_five: boolean;
  leasing_period_start: string | null;
  leasing_period_end: string | null;
  extra_equipment: string;
  inspections: Inspection[];
};

export type Inspection = {
  id: number;
  vehicle_id: number;
  registration: string | null;
  vin: string;
  date: string;
  result: string;
  mileage: number;
  pdf: string;
};
