/**
 * Numeric inputs required to calculate a new average share price.
 * All values are already parsed and validated (finite, positive numbers).
 */
export interface AverageInput {
  oldPrice: number;
  oldLot: number;
  newPrice: number;
  newLot: number;
}

/**
 * Result of an average price calculation.
 */
export interface AverageResult {
  /** Old lot + new lot. */
  totalLot: number;
  /** Old shares + new shares (1 Lot = 100 Shares). */
  totalShares: number;
  /** Old investment + new investment (total modal). */
  totalInvestment: number;
  /** Total investment divided by total shares. */
  averagePrice: number;
  /** Cash needed for the new purchase alone (new price × new shares). */
  newInvestmentNeeded: number;
}

/**
 * Raw string values coming straight from the Raycast form fields.
 */
export interface FormValues {
  oldPrice: string;
  oldLot: string;
  newPrice: string;
  newLot: string;
}
