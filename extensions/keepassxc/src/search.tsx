import { useState, useEffect } from "react";
import { Detail, getPreferenceValues } from "@raycast/api";
import { KeePassLoader } from "./utils/keepass-loader";
import { InactivityTimer } from "./utils/inactivity-timer";
import SearchDatabase from "./components/search-database";
import UnlockDatabase from "./components/unlock-database";

interface Preference {
  lockAfterInactivity: string;
}

const preferences: Preference = getPreferenceValues();
// Minute(s) before locking the database
const lockAfterInactivity = Number(preferences.lockAfterInactivity);

/**
 * The entry point of Search command.
 *
 * This component determines whether the database is already unlocked or not,
 * and renders either the search interface or the unlock interface accordingly.
 *
 * If the user has set the lockAfterInactivity preference, the component will
 * automatically launch an inactivity timer, which will lock the database after
 * the specified amount of time if the user doesn't interact with the database.
 *
 * @returns {JSX.Element} The rendered component.
 */
export default function Command() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    KeePassLoader.loadCredentialsCache().then((credentials) => {
      if (credentials.databasePassword) {
        if (lockAfterInactivity > 0) {
          InactivityTimer.hasRecentActivity().then((hasRecentActivity) => {
            if (hasRecentActivity) {
              setIsUnlocked(true);
              KeePassLoader.setCredentials(credentials.databasePassword, credentials.keyFile);
            } else {
              KeePassLoader.deleteCredentialsCache();
            }
            InactivityTimer.launchInactivityTimer();
          });
        } else {
          KeePassLoader.setCredentials(credentials.databasePassword, credentials.keyFile);
          setIsUnlocked(true);
        }
      } else {
        if (lockAfterInactivity > 0) {
          InactivityTimer.launchInactivityTimer();
        }
      }
      setIsLoaded(true);
    });
  }, []);

  if (!isLoaded) {
    return <Detail />;
  } else if (!isUnlocked) {
    return <UnlockDatabase setIsUnlocked={setIsUnlocked} />;
  } else {
    return <SearchDatabase setIsUnlocked={setIsUnlocked} />;
  }
}
