import { CookieJar, Cookie } from 'tough-cookie';
import { DOMAIN, GENERAL_DOMAIN } from '../utils/config';
import { getStorage, setStorage, StorageKey } from '../utils/storage';

export const cookieJar = new CookieJar();

export let isAuthenticated = false;

export async function checkAuthState(): Promise<boolean> {
  if (isAuthenticated) return true;
  const session = await getStorage(StorageKey.SpaceSession);
  if (session) {
    await setSpaceSession(session);
    return true;
  }
  return false;
}

export async function setSpaceSession(session: string): Promise<void> {
  isAuthenticated = true;

  cookieJar.setCookieSync(
    new Cookie({
      key: 'session',
      value: session,
      domain: DOMAIN,
    }),
    GENERAL_DOMAIN
  );

  await setStorage(StorageKey.SpaceSession, session);
}
