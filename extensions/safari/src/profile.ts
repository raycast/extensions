export type ProfiledTab = { title: string; profileName?: string };

export function getDisplayTitle(tab: { title: string; profileName?: string }): string {
  const profile = tab.profileName?.trim();
  return profile ? `${profile} — ${tab.title}` : tab.title;
}

export function getUniqueProfiles<T extends { profileName?: string }>(tabs: T[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tab of tabs) {
    const name = tab.profileName?.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

export function filterTabsByProfile<T extends { title: string; profileName?: string }>(
  tabs: T[],
  selectedProfile: string,
): T[] {
  if (selectedProfile === "all") return tabs;
  return tabs.filter((tab) => tab.profileName?.trim() === selectedProfile);
}

export function resolveSelectedProfile(selectedProfile: string, profiles: string[]): string {
  if (selectedProfile === "all") return "all";
  return profiles.includes(selectedProfile) ? selectedProfile : "all";
}
