import { AbortError, got } from 'got';
import { getDefaultStore } from 'jotai';
import { Cookie, CookieJar } from 'tough-cookie';
import { isAuthenticatedAtom } from '../hooks/atoms';
import { DOMAIN, GENERAL_DOMAIN } from '../utils/config';
import { StorageKey, getStorage, setStorage } from '../utils/storage';

export const cookieJar = new CookieJar();

export const client = got.extend({
  cookieJar,
  headers: { 'User-Agent': 'Raycast' },
  responseType: 'json',
});

export async function checkAuthState(): Promise<boolean> {
  if (getDefaultStore().get(isAuthenticatedAtom)) return true;
  const session = await getStorage(StorageKey.SpaceSession);
  if (session) {
    await setAuthData(session);
    return true;
  }
  return false;
}

export async function setAuthData(session: string): Promise<void> {
  getDefaultStore().set(isAuthenticatedAtom, true);

  cookieJar.setCookieSync(
    new Cookie({
      key: 'session',
      value: session,
      domain: DOMAIN,
    }),
    GENERAL_DOMAIN,
  );

  await setStorage(StorageKey.SpaceSession, session);
}

export function isAbortError(error: unknown): error is AbortError {
  return error instanceof AbortError;
}
