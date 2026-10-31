import { MerossSession } from "./meross";

// One session per extension worker. It lives outside React so that remounts (e.g. React StrictMode in
// development) can't close it while it's still in use; Raycast tears the worker down when the command closes.
let sessionPromise: Promise<MerossSession> | null = null;

export function getSession(mfaCode?: string) {
  if (!sessionPromise) {
    const opening = MerossSession.open({ mfaCode });
    opening.catch(() => {
      if (sessionPromise === opening) sessionPromise = null;
    });
    sessionPromise = opening;
  }
  return sessionPromise;
}
