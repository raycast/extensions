import { BambooHRClient } from "../bamboo/api";
import { Preferences } from "../preferences";

export function createClient(preferences: Preferences): BambooHRClient {
  return new BambooHRClient(
    preferences.apiKey,
    preferences.companyDomain,
    preferences.employeeId,
  );
}
