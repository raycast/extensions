import type { System } from "../types/system";

export const getSystemUrl = (host: string, system: System) => {
  return `${host}/system/${encodeURIComponent(system.name)}`;
};
