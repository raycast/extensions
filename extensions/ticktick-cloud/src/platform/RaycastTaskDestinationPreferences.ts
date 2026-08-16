import { raycastTaskDestinationStorage } from "./RaycastTaskDestinationStorage";
import { TaskDestinationPreferenceStore } from "./taskDestinationPreferences";

export const raycastTaskDestinationPreferences = new TaskDestinationPreferenceStore(raycastTaskDestinationStorage);
