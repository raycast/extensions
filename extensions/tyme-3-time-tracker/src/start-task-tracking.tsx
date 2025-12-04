import { showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { checkTymeAvailability } from "./tasks";
import { ProjectList } from "./components/ProjectList";

export default function StartTaskTracking() {
  // Check if Tyme is available when component mounts
  useCachedPromise(checkTymeAvailability, [], {
    onError: () => showHUD("Cannot connect to Tyme. Is it running?"),
  });

  return <ProjectList />;
}
