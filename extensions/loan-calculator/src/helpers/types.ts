export interface LoanInputs {
  loanAmount: string;
  loanTermYears: string;
  loanTermMonths: string;
  interestRate: string;
  compound: CompoundFrequency;
  payBack: PaymentFrequency;
}

export type CompoundFrequency =
  | "annually"
  | "semi-annually"
  | "quarterly"
  | "monthly"
  | "semi-monthly"
  | "weekly"
  | "daily";
export type PaymentFrequency =
  | "daily"
  | "weekly"
  | "semi-monthly"
  | "monthly"
  | "quarterly"
  | "semi-annually"
  | "annually";

export interface PaymentSchedule {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface CalculationResult {
  totalPayments: number;
  totalInterest: number;
  paymentAmount: number;
  schedule: PaymentSchedule[];
}

export const COMPOUND_OPTIONS = [
  { title: "Annually", value: "annually" },
  { title: "Semi-Annually", value: "semi-annually" },
  { title: "Quarterly", value: "quarterly" },
  { title: "Monthly", value: "monthly" },
  { title: "Semi-Monthly", value: "semi-monthly" },
  { title: "Weekly", value: "weekly" },
  { title: "Daily", value: "daily" },
];

export const PAYMENT_OPTIONS = [
  { title: "Every Day", value: "daily" },
  { title: "Every Week", value: "weekly" },
  { title: "Every Semi Month", value: "semi-monthly" },
  { title: "Every Month", value: "monthly" },
  { title: "Every Quarter", value: "quarterly" },
  { title: "Every 6 Months", value: "semi-annually" },
  { title: "Every Year", value: "annually" },
];
