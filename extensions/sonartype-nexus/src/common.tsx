import { Nexus, NexusComponent } from "./api";
import { getPreferenceValues } from "@raycast/api";

export function createNexusClient(): Nexus {
  const preferences = getPreferenceValues();
  return new Nexus(preferences.instance);
}

export const nexus = createNexusClient();

export function getDefaultSearchFormatPreference(): string {
  const preferences = getPreferenceValues();
  return preferences.defaultSearchFormat || "all";
}

export function getFetchAllPagePreference(): boolean {
  const preferences = getPreferenceValues();
  return preferences.fetchAllPage || false;
}

export function replaceMavenVersionTimestampWithSnapshot(components: NexusComponent[]): NexusComponent[] {
  return components.map((c) => {
    if (c.format !== "maven2") {
      return c;
    } else {
      return {
        ...c,
        version: c.version.replace(/-\d{8}\.\d{6}-\d+$/g, "-SNAPSHOT"),
      };
    }
  });
}
