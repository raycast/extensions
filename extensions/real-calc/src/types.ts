export interface FormValues {
  financialValue: string;
  startDate: Date | null;
  endDate: Date | null;
  priceIndex: string;
}

export interface FinancialIndexData {
  data: string;
  valor: string;
}

export interface CalculationResult {
  originalValue: string;
  updatedValue: string;
  startDate: string;
  endDate: string;
  priceIndex: string;
  adjustmentFactor: string;
  percentageChange: string;
  data: FinancialIndexData[];
}
