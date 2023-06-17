import { AbortError } from 'got';
import { CookieJar, Cookie } from 'tough-cookie';
import { DOMAIN, GENERAL_DOMAIN } from '../utils/config';
import { getStorage, setStorage, StorageKey } from '../utils/storage';

export const cookieJar = new CookieJar();

export let isAuthenticated = false;
let tenantPrefixUrl = '';

export async function checkAuthState(): Promise<boolean> {
  if (isAuthenticated) return true;
  const [tenantDomain, session] = await Promise.all([
    getStorage(StorageKey.TenantDomain),
    getStorage(StorageKey.SpaceSession),
  ]);
  if (tenantDomain && session) {
    await setAuthData(tenantDomain, session);
    return true;
  }
  return false;
}

export async function setAuthData(tenantDomain: string, session: string): Promise<void> {
  isAuthenticated = true;
  tenantPrefixUrl = `https://${tenantDomain}`;

  cookieJar.setCookieSync(
    new Cookie({
      key: 'session',
      value: session,
      domain: DOMAIN,
    }),
    GENERAL_DOMAIN
  );

  await Promise.all([setStorage(StorageKey.TenantDomain, tenantDomain), setStorage(StorageKey.SpaceSession, session)]);
}

export function getTenantPrefixUrl(): string {
  return tenantPrefixUrl;
}

export function isAbortError(error: unknown): error is AbortError {
  return error instanceof AbortError;
}
