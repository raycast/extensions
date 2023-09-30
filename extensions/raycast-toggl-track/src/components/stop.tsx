import { Detail, showHUD, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { stopRunningTimeEntry } from "../toggl/time-entries";
import ToggleClient from "../toggl/client";

interface Preferences {
  togglAPIKey: string;
}

export default function Stop() {
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const preferences = getPreferenceValues<Preferences>();
  const client = ToggleClient(preferences.togglAPIKey);
  stopRunningTimeEntry(client).then((timeEntry) => {
    if (timeEntry === null) {
      setIsLoading(false);
    } else {
      showHUD(`✅ "${timeEntry.description}" stopped`, { clearRootSearch: true });
    }
  });

  return <Detail isLoading={isLoading} markdown={"🙅‍♂️ No active time entry running"} />;
}
