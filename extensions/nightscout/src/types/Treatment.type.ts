export interface Treatment {
  _id?: string; // mongoDB ID
  eventType: string;
  created_at: string; // ISO date string
  eventTime?: string; // ISO date string for when the treatment occurred
  glucose: number | null;
  glucoseType?: "Finger" | "Sensor";
  carbs: number | null;
  duration?: number; // related to the given eventType
  percent?: number; // change in basal rate for Temporary Basal
  absolute?: number; // exact basal rate for Temporary Basal rather than percent change
  profile?: string; // profile name for Profile Switch
  protein?: number;
  fat?: number;
  insulin: number | null;
  enteredinsulin?: number; // Original insulin amount for combo bolus calculations
  relative?: number; // extended insulin amount for combo bolus (opposite of immediate)
  units?: "mg/dl" | "mmol"; // units for glucose value
  transmitterId?: string;
  sensorCode?: string; // Dexcom G6 start code
  notes?: string;
  enteredBy?: string;
  preBolus?: number; // minutes before/after meal for Food Bolus
  splitNow?: number; // immediate insulin for Combo Bolus
  splitExt?: number; // extended insulin for Combo Bolus
}
