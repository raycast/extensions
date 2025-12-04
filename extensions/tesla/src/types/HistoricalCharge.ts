export interface HistoricalCharge {
  id: number;
  started_at: number;
  ended_at: number;
  created_at: number;
  updated_at: number | null;
  location: string;
  latitude: number;
  longitude: number;
  is_supercharger: boolean;
  odometer: number;
  energy_added: number;
  energy_used: number;
  miles_added: number;
  miles_added_ideal: number;
  starting_battery: number;
  ending_battery: number;
  cost: number;
}
