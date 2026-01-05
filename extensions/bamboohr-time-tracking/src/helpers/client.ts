import { BambooHRClient } from "../bamboo/api";

export function createClient(preferences: Preferences): BambooHRClient {
  return new BambooHRClient(
    preferences.apiKey,
    preferences.companyDomain,
    preferences.employeeId,
  );
}
