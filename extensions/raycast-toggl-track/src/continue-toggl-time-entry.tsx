import { getPreferenceValues } from "@raycast/api";
import ApiKeyMissing from "./components/api-key-missing";
import ContinueTimeEntry from "./components/continue-time-entry";
import InternetStatus from "./components/internet-status";
interface Preferences {
  togglAPIKey: string;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  if (!("togglAPIKey" in preferences)) {
    return <ApiKeyMissing />;
  } else {
    return (
      <InternetStatus
        onlineComponent={<ContinueTimeEntry />} // Replace with your custom component
      />
    );
  }
}
