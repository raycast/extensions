import { environment } from "@raycast/api";
import {
  PROD_SUPABASE_URL,
  PROD_SUPABASE_PUBLISHABLE_KEY,
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_PUBLISHABLE_KEY,
  PROD_STRIPE_PRICE_MONTHLY,
  PROD_STRIPE_PRICE_ANNUAL,
  LOCAL_STRIPE_PRICE_MONTHLY,
  LOCAL_STRIPE_PRICE_ANNUAL,
} from "../constants";

/**
 * Selects the Supabase environment automatically: development commands
 * (`npm run dev`) talk to the local Docker stack, while installed/published
 * commands talk to production. No manual configuration is required.
 */
const isLocalEnvironment = environment.isDevelopment;

/** Picks the local or production value for the current environment. */
const pickEnv = <T>(local: T, prod: T): T => (isLocalEnvironment ? local : prod);

export const SUPABASE_URL = pickEnv(LOCAL_SUPABASE_URL, PROD_SUPABASE_URL);
export const SUPABASE_PUBLISHABLE_KEY = pickEnv(LOCAL_SUPABASE_PUBLISHABLE_KEY, PROD_SUPABASE_PUBLISHABLE_KEY);
export const STRIPE_PRICE_MONTHLY = pickEnv(LOCAL_STRIPE_PRICE_MONTHLY, PROD_STRIPE_PRICE_MONTHLY);
export const STRIPE_PRICE_ANNUAL = pickEnv(LOCAL_STRIPE_PRICE_ANNUAL, PROD_STRIPE_PRICE_ANNUAL);
