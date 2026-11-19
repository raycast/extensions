export type SonarrInstanceId = "primary" | "secondary";

export interface SonarrInstance {
  id: SonarrInstanceId;
  name: string;
  url: string;
  apiKey: string;
}

/**
 * What `useInstance()` returns. Commands pass this straight down to their list
 * items so a single prop carries both the instance to query and the actions
 * needed to switch away from it.
 */
export interface InstanceState {
  instance: SonarrInstance | null;
  instances: SonarrInstance[];
  isLoading: boolean;
  switchToInstance: (instance: SonarrInstance) => void;
}
