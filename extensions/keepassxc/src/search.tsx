import { useState, useEffect } from "react";
import { JSX } from "react/jsx-runtime";
import { Detail } from "@raycast/api";
import { KeePassLoader } from "./utils/keepass-loader";
import { InactivityTimer, LOCK_AFTER_MS } from "./utils/inactivity-timer";
import SearchDatabase from "./components/search-database";
import UnlockDatabase from "./components/unlock-database";

/**
 * The entry point of Search command
 *
 * This component determines whether the database is already unlocked or not,
 * and renders either the search interface or the unlock interface accordingly.
 * When auto-lock is enabled (`LOCK_AFTER_MS > 0`), a lock watcher is started
 * once the database is unlocked — whether from cached credentials on mount or
 * via the unlock form — and stopped when the database is locked or the command
 * unmounts.
 *
 * @returns {JSX.Element} - The rendered component
 */
export default function Command(): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    KeePassLoader.loadCredentialsCache().then((credentials) => {
      if (credentials.databasePassword || credentials.keyFile) {
        if (LOCK_AFTER_MS > 0) {
          InactivityTimer.hasRecentActivity().then((recent) => {
            if (recent) {
              KeePassLoader.setCredentials(credentials.databasePassword, credentials.keyFile);
              setIsUnlocked(true);
              void InactivityTimer.recordActivity();
            } else {
              KeePassLoader.deleteCredentialsCache();
              KeePassLoader.clearCredentials();
            }
            setIsLoaded(true);
          });
        } else {
          KeePassLoader.setCredentials(credentials.databasePassword, credentials.keyFile);
          setIsUnlocked(true);
          setIsLoaded(true);
        }
      } else {
        setIsLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!isUnlocked || LOCK_AFTER_MS <= 0) return () => {};
    const cleanup = InactivityTimer.startLockWatcher(() => {
      KeePassLoader.deleteCredentialsCache();
      KeePassLoader.clearCredentials();
      setIsUnlocked(false);
    });
    return () => cleanup();
  }, [isUnlocked]);

  if (!isLoaded) {
    return <Detail />;
  } else if (!isUnlocked) {
    return <UnlockDatabase setIsUnlocked={setIsUnlocked} />;
  } else {
    return <SearchDatabase setIsUnlocked={setIsUnlocked} />;
  }
}
