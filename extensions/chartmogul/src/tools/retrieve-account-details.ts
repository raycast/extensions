import { retrieveAccountDetails } from "../api";

/**
 * Retrieve account details in ChartMogul. Like name, currency, timezone, etc.
 * @returns {Promise<AccountDetailsResponse>}
 */
export default async function () {
  const res = await retrieveAccountDetails();

  if (!res.ok) {
    throw new Error(`Failed to retrieve account details (${res.status})`);
  }

  return res.json();
}
