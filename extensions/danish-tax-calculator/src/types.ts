export interface TaxCalculation {
  incomeValue: number;
  am: number;
  taxableIncome: number;
  tax: number;
  salary: number;
  argPercentage: number;
}

export interface CalculationParams {
  income: string;
  deduction?: string;
  drawPercentage?: string;
  defaultPercentage?: string;
}
