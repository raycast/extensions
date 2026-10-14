import { useEffect, useState } from "react";
import { JSX } from "react/jsx-runtime";
import { Action, ActionPanel, Detail, getPreferenceValues } from "@raycast/api";

import CreateEntryForm from "./components/create-entry-form";
import UnlockDatabase from "./components/unlock-database";
import { InactivityTimer } from "./utils/inactivity-timer";
import { KeePassLoader } from "./utils/keepass-loader";

const lockAfterInactivity = Number(getPreferenceValues().lockAfterInactivity);

export default function Command(): JSX.Element {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setIsLoaded(false);
    setHasLoadError(false);

    const loadCredentials = async () => {
      try {
        const credentials = await KeePassLoader.loadCredentialsCache();
        if (!active) return;

        if (credentials.databasePassword || credentials.keyFile) {
          if (lockAfterInactivity > 0) {
            const hasRecentActivity = await InactivityTimer.hasRecentActivity();
            if (!active) return;

            if (hasRecentActivity) {
              KeePassLoader.setCredentials(credentials.databasePassword, credentials.keyFile);
              setIsUnlocked(true);
            } else {
              KeePassLoader.deleteCredentialsCache();
            }
            InactivityTimer.launchInactivityTimer();
          } else {
            KeePassLoader.setCredentials(credentials.databasePassword, credentials.keyFile);
            setIsUnlocked(true);
          }
        } else if (lockAfterInactivity > 0) {
          InactivityTimer.launchInactivityTimer();
        }
        setIsLoaded(true);
      } catch {
        if (active) {
          setHasLoadError(true);
          setIsLoaded(true);
        }
      }
    };

    void loadCredentials();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  if (!isLoaded) {
    return <Detail isLoading markdown="Loading database…" />;
  }

  if (hasLoadError) {
    return (
      <Detail
        markdown="# Could Not Load Database\n\nRaycast could not load the saved unlock state. Try again."
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => setLoadAttempt((attempt) => attempt + 1)} />
          </ActionPanel>
        }
      />
    );
  }

  if (!isUnlocked) {
    return <UnlockDatabase setIsUnlocked={setIsUnlocked} />;
  }

  return <CreateEntryForm setIsUnlocked={setIsUnlocked} />;
}
