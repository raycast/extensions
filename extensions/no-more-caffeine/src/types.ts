export interface CaffeineIntake {
  id: string;
  timestamp: Date;
  amount: number; // in mg
  drinkType: string;
  amountDescription?: string; // optional description like "1 cup", "200ml"
}

export type CaffeineStatus = "safe" | "warning" | "no-more-caffeine";

export interface DrinkPreset {
  name: string;
  defaultCaffeineMg: number;
}

export interface CustomDrink {
  id: string;
  name: string;
  defaultCaffeineMg: number;
}

export interface Settings {
  bedtime: string; // time format like "22:00"
  halfLife: number; // in hours
  maxCaffeineAtBedtime: number; // in mg
  dailyMaxCaffeine?: number; // in mg, optional
}

export interface CaffeineCalculation {
  currentResidual: number;
  predictedResidualAtBedtime: number;
  predictedResidualAtBedtimeWithNewDrink?: number;
  status: CaffeineStatus;
  todayTotal: number;
}
