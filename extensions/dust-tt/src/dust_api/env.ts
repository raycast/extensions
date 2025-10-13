import { LocalStorage } from "@raycast/api";

const authEnv = {
  OAUTH_CLIENT_ID: "client_01JGCT55T7FVDG9XF74925R1KT",
  OAUTH_DOMAIN: "https://api.workos.com",
};

// Region configuration for Dust API
const DUST_US_URL = "https://dust.tt";
const DUST_EU_URL = "https://eu.dust.tt";
const DEFAULT_DUST_API_DOMAIN = DUST_US_URL;

async function getDustDomain(): Promise<string> {
  const region = await LocalStorage.getItem<string>("selectedRegion");
  if (region === "europe-west1") {
    return DUST_EU_URL;
  }
  return DUST_US_URL; // Default to US
}

const env = {
  auth: authEnv,
  DUST_US_URL,
  DUST_EU_URL,
  DEFAULT_DUST_API_DOMAIN,
  getDustDomain,
};

export default env;
