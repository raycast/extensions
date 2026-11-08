export interface DiscoveredApplication {
  name: string;
  path: string;
  bundleId?: string;
}

export interface LauncherApplication extends DiscoveredApplication {
  /** Path identity keeps separate installations individually selectable. */
  id: string;
  stableId: string;
  hasMultipleInstallations: boolean;
  isPreferredInstallation: boolean;
}
