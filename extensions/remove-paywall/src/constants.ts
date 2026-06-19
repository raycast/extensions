export enum RemovePaywallService {
  ArchiveIs = "https://archive.is",
  RemovePaywall = "https://www.removepaywall.com",
  Freedium = "https://freedium-mirror.cfd",
}

// Default service used when the user hasn't chosen a preference
export const DEFAULT_REMOVE_PAYWALL_SERVICE = RemovePaywallService.ArchiveIs;

// A name mapping for display or config purposes (not currently used programmatically)
export const RemovePaywallServiceNames: Record<RemovePaywallService, string> = {
  [RemovePaywallService.ArchiveIs]: "Archive (archive.is)",
  [RemovePaywallService.RemovePaywall]: "RemovePaywall (removepaywall.com)",
  [RemovePaywallService.Freedium]: "Freedium (freedium-mirror.cfd)",
};
