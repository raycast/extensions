export type MortgageLocation = "US" | "CA" | "UK" | "AU";

export interface MortgageDetails {
  propertyValue: number;
  downPayment: number;
  interestRate: number; // e.g. 5.5 for 5.5%
  loanTermYears: number;
  location: MortgageLocation;
  isInterestOnly?: boolean;
}

export interface MortgageResult {
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
  principal: number;
  monthlyPrincipalAndInterest: number;
}

/**
 * Calculates mortgage payments with support for various country compounding methods.
 */
export function calculateMortgage(details: MortgageDetails): MortgageResult {
  const { propertyValue, downPayment, interestRate, loanTermYears, location, isInterestOnly } = details;
  const principal = propertyValue - downPayment;
  const numPayments = loanTermYears * 12;
  const annualRate = interestRate / 100;

  if (principal <= 0) {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      totalCost: downPayment,
      principal: 0,
      monthlyPrincipalAndInterest: 0,
    };
  }

  let r = 0; // effective monthly interest rate

  switch (location) {
    case "CA":
      // Canadian semi-annual compounding: calculated twice a year, but paid monthly
      r = Math.pow(1 + annualRate / 2, 1 / 6) - 1;
      break;
    case "AU":
      // Australian daily compounding: calculated daily, paid monthly
      r = Math.pow(1 + annualRate / 365, 365 / 12) - 1;
      break;
    case "UK":
    case "US":
    default:
      // Standard monthly compounding: calculated monthly, paid monthly
      r = annualRate / 12;
      break;
  }

  let monthlyPayment = 0;

  if (isInterestOnly) {
    monthlyPayment = principal * r;
  } else if (r === 0) {
    // 0% interest edge case
    monthlyPayment = principal / numPayments;
  } else {
    // Standard amortization formula
    monthlyPayment = (principal * r * Math.pow(1 + r, numPayments)) / (Math.pow(1 + r, numPayments) - 1);
  }

  const totalCostOfLoan = monthlyPayment * numPayments;
  const totalInterest = totalCostOfLoan - principal;

  return {
    monthlyPayment,
    totalInterest,
    totalCost: totalCostOfLoan + downPayment,
    principal,
    monthlyPrincipalAndInterest: monthlyPayment,
  };
}
