export interface Preferences {
  capital: string; // Preferences are initially strings
  riskPercent: string;
  currencyCode: string;
}

export type CalculationMode = "Fixed Price" | "RRR-Based" | "% SL/Target" | "Fixed Risk";
// Add "ATR Mode" back if needed later

export interface CalculationInputs {
  mode: CalculationMode;
  capital: number;
  riskPercent: number; // As a percentage value (e.g., 1.0 for 1%)
  entry: number;
  // Mode specific - use optional chaining or ensure they exist based on mode
  slPrice?: number;
  targetPrice?: number;
  rrr?: number;
  slPercent?: number; // As a percentage value (e.g., 2.0 for 2%)
  targetPercent?: number; // As a percentage value (e.g., 4.0 for 4%)
  fixedRiskAmt?: number;
}

export interface CalculationResult {
  mode: CalculationMode;
  capital: number;
  riskAmount: number; // The actual currency amount risked
  entry: number;
  stopLoss: number;
  target: number;
  riskPerShare: number;
  positionSize: number; // Quantity
  investmentAmount: number; // Exposure
  reward: number; // Potential profit in currency
  rewardRiskRatio: number;
  stopLossPercent: number; // Calculated SL percentage
  targetPercent: number; // Calculated Target percentage
  exposurePercent: number; // Investment as % of capital
}

// Type for the form values managed by React state
export interface FormValues {
  mode: CalculationMode;
  entry: string;
  slPrice: string;
  targetPrice: string;
  rrr: string;
  slPercent: string;
  targetPercent: string;
  fixedRiskAmt: string;
}
