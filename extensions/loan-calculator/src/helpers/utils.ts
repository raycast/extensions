import { LoanInputs, CalculationResult, PaymentSchedule, CompoundFrequency, PaymentFrequency } from "./types";

export function getFrequencyPerYear(frequency: CompoundFrequency | PaymentFrequency): number {
  switch (frequency) {
    case "daily":
      return 365;
    case "weekly":
      return 52;
    case "semi-monthly":
      return 24;
    case "monthly":
      return 12;
    case "quarterly":
      return 4;
    case "semi-annually":
      return 2;
    case "annually":
      return 1;
    default:
      return 12;
  }
}

export function calculateLoan(inputs: LoanInputs): CalculationResult {
  const principal = parseFloat(inputs.loanAmount);
  const annualRate = parseFloat(inputs.interestRate) / 100;

  const loanYears = parseFloat(inputs.loanTermYears || "0");
  const loanMonths = parseFloat(inputs.loanTermMonths || "0");

  if (principal <= 0) {
    throw new Error("Loan amount must be greater than 0");
  }
  if (annualRate < 0) {
    throw new Error("Interest rate cannot be negative");
  }
  if (loanYears < 0 || loanMonths < 0) {
    throw new Error("Loan term cannot be negative");
  }

  const totalYears = loanYears + loanMonths / 12;

  if (totalYears <= 0) {
    throw new Error("Total loan term must be greater than 0");
  }

  const compoundFreq = getFrequencyPerYear(inputs.compound);
  const paymentFreq = getFrequencyPerYear(inputs.payBack);

  const totalPayments = totalYears * paymentFreq;

  // Handle zero interest rate case
  if (annualRate === 0) {
    const payment = principal / totalPayments;
    const schedule: PaymentSchedule[] = [];
    let remainingBalance = principal;

    for (let i = 1; i <= totalPayments; i++) {
      const principalPayment = payment;
      remainingBalance -= principalPayment;

      schedule.push({
        period: i,
        payment: payment,
        principal: principalPayment,
        interest: 0,
        balance: Math.max(0, remainingBalance),
      });
    }

    return {
      totalPayments: principal,
      totalInterest: 0,
      paymentAmount: payment,
      schedule,
    };
  }

  const periodicRate = annualRate / compoundFreq;
  const effectiveRate = Math.pow(1 + periodicRate, compoundFreq / paymentFreq) - 1;

  // Calculate payment amount using loan payment formula
  const payment =
    (principal * (effectiveRate * Math.pow(1 + effectiveRate, totalPayments))) /
    (Math.pow(1 + effectiveRate, totalPayments) - 1);

  // Generate payment schedule
  const schedule: PaymentSchedule[] = [];
  let remainingBalance = principal;

  for (let i = 1; i <= totalPayments; i++) {
    const interestPayment = remainingBalance * effectiveRate;
    const principalPayment = payment - interestPayment;
    remainingBalance -= principalPayment;

    schedule.push({
      period: i,
      payment: payment,
      principal: principalPayment,
      interest: interestPayment,
      balance: Math.max(0, remainingBalance),
    });

    if (remainingBalance <= 0) break;
  }

  const totalPaid = payment * schedule.length;
  const totalInterestPaid = totalPaid - principal;

  return {
    totalPayments: totalPaid,
    totalInterest: totalInterestPaid,
    paymentAmount: payment,
    schedule,
  };
}
