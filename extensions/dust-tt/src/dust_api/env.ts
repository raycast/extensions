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
  const storedUrl = await LocalStorage.getItem<string>("dustApiUrl");
  return storedUrl || DEFAULT_DUST_API_DOMAIN;
}

const env = {
  auth: authEnv,
  DUST_US_URL,
  DUST_EU_URL,
  DEFAULT_DUST_API_DOMAIN,
  getDustDomain,
};

export default env;
