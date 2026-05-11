export interface GlucoseEntry {
  sgv: number;
  date: number; // unix timestamp in milliseconds
  direction:
    | "NONE"
    | "DoubleUp"
    | "SingleUp"
    | "FortyFiveUp"
    | "Flat"
    | "FortyFiveDown"
    | "SingleDown"
    | "DoubleDown"
    | "NOT COMPUTABLE"
    | "RATE OUT OF RANGE";
  dateString: string; // ISO date string
  type: string;
  device?: string; // reporting device
  utcOffset?: number; // UTC offset, useful for dateString context
  sysTime?: string;
  _id?: string; // mongoDB ID
  mills?: number;
}
