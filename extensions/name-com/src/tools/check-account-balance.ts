import { callCoreApi } from "../api";

/**
 * The default currency is USD ($)
 */
export default async function () {
  const result = await callCoreApi<{ balance: number }>("accountinfo/balance");
  return result.balance;
}
