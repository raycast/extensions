import { get } from "./wiseClient";

export interface Balance {
  id: number;
  currency: string;
  amount: { value: number; currency: string };
  reservedAmount: { value: number; currency: string };
  cashAmount: { value: number; currency: string };
  totalWorth: { value: number; currency: string };
  type: string;
  name: string | null;
  icon: { type: string; value: string } | null;
  visible: boolean;
  primary: boolean;
}
export const fetchBalances = async (profileId: string) => {
  return await get<Balance[]>(`v4/profiles/${profileId}/balances?types=STANDARD,SAVINGS`);
};
