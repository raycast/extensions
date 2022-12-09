import { FormValidation } from "@raycast/utils";

export const basicFieldValidations = {
  symbol: FormValidation.Required,
  amount: (value?: string) => {
    if (!value) {
      return "Amount is required";
    }

    const amount = parseFloat(value);
    if (isNaN(amount)) {
      return "Amount must be a number";
    }
    if (amount < 150) {
      return "Amount must be greater than 150";
    }
  },
  rate: (value?: string) => {
    if (!value) {
      return "Rate is required";
    }

    const rate = parseFloat(value);
    if (isNaN(rate)) {
      return "Rate must be a number";
    }
  },
  period: (value?: string) => {
    if (!value) {
      return "Period is required";
    }

    const period = parseInt(value, 10);
    if (isNaN(period)) {
      return "Period must be a number";
    }

    if (period < 1 || period > 120) {
      return "Period must be between 1 and 120";
    }
  },
};
