import { ToastStyle } from "@raycast/api";
import { TAccount } from "../types";

export const createResolvedToast = (
  toast: any,
  title: string,
  message?: string,
): { error: () => void; success: () => void } => {
  toast.title = title;
  toast.message = message;

  const error = (): void => {
    toast.style = ToastStyle.Failure;
  };

  const success = (): void => {
    toast.style = ToastStyle.Success;
  };

  return { error, success };
};

export const formatAccounts = (accounts: TAccount[]): TAccount[] => {
  return accounts
    .filter(({ available }) => available > 0)
    .map(({ currency, available, id }: TAccount) => ({ currency, available: round(available, 4), id }));
};

export const capitalize = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export const round = (number: number, decimals = 2) => {
  return Math.round(number * 10 ** decimals) / 10 ** decimals;
};
