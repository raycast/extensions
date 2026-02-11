import { callCoreApi } from "../api";
import { Domain } from "../types";

/**
 * Lists the domains in account.
 * The default currency is USD ($)
 */
export default async function () {
  const result = await callCoreApi<{ domains: Domain[] }>("domains");
  return result.domains;
}
