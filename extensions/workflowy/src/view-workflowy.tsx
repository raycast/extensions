import { MissingApiKeyDetail } from "./components/MissingApiKeyDetail";
import { ViewWorkflowyList } from "./components/ViewWorkflowyList";
import { resolveDefaultCaptureDestination } from "./lib/capture-options";
import { getPreferences, hasApiKey } from "./lib/preferences";

export default function Command() {
  if (!hasApiKey()) {
    return <MissingApiKeyDetail />;
  }

  const preferences = getPreferences();
  const defaultLocation = resolveDefaultCaptureDestination(preferences.viewDefaultTarget);

  return (
    <ViewWorkflowyList
      isRoot
      location={{
        title: defaultLocation.title,
        target: defaultLocation.target,
        targetNodeId: defaultLocation.targetNodeId,
        path: defaultLocation.title,
      }}
    />
  );
}
