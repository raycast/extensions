import { registerSecret } from "../core/errors";
import { Http } from "../core/http";
import { GumroadProvider } from "./gumroad/adapter";
import { LemonSqueezyProvider } from "./lemonsqueezy/adapter";
import { PaddleProvider } from "./paddle/adapter";
import { StripeProvider } from "./stripe/adapter";
import { PROVIDER_IDS, Provider, ProviderId } from "./types";

/** The subset of extension preferences the registry reads. */
export type ProviderPreferences = {
  stripeApiKey?: string;
  lemonSqueezyApiKey?: string;
  gumroadAccessToken?: string;
  paddleApiKey?: string;
  paddleEnvironment?: string;
};

type Factory = (key: string, prefs: ProviderPreferences, http: Http) => Provider;

const FACTORIES: Record<ProviderId, Factory> = {
  stripe: (key, _prefs, http) => new StripeProvider(key, http),
  lemonsqueezy: (key, _prefs, http) => new LemonSqueezyProvider(key, http),
  gumroad: (key, _prefs, http) => new GumroadProvider(key, http),
  paddle: (key, prefs, http) => new PaddleProvider(key, http, prefs.paddleEnvironment),
};

export function keyFor(id: ProviderId, prefs: ProviderPreferences): string | undefined {
  const raw = {
    stripe: prefs.stripeApiKey,
    lemonsqueezy: prefs.lemonSqueezyApiKey,
    gumroad: prefs.gumroadAccessToken,
    paddle: prefs.paddleApiKey,
  }[id];
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

/** Providers with a key, in the fixed PROVIDER_IDS order. */
export function configuredProviderIds(prefs: ProviderPreferences): ProviderId[] {
  return PROVIDER_IDS.filter((id) => keyFor(id, prefs) !== undefined);
}

/**
 * Free tier: only the first configured provider is active, the rest are locked.
 * Pro: every configured provider is active.
 */
export function partitionProviders(
  configured: ProviderId[],
  isPro: boolean,
): { active: ProviderId[]; locked: ProviderId[] } {
  if (isPro) return { active: configured, locked: [] };
  return { active: configured.slice(0, 1), locked: configured.slice(1) };
}

export function createProviders(ids: ProviderId[], prefs: ProviderPreferences, http: Http): Provider[] {
  return ids.flatMap((id) => {
    const key = keyFor(id, prefs);
    if (!key) return [];
    registerSecret(key);
    return [FACTORIES[id](key, prefs, http)];
  });
}
