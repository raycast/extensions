import { getPreferenceValues } from "@raycast/api";
import { ServiceId, serviceIdsWithoutAll } from "./types";

type Preferences = {
  apiKey: string;
  area: string;
  g1: boolean;
  e1: boolean;
  s1: boolean;
  s2: boolean;
  s5: boolean;
  s6: boolean;
};

const values = getPreferenceValues<Preferences>();

export const preferences = {
  apiKey: values.apiKey,
  area: values.area,
  services: serviceIdsWithoutAll.filter((serviceId) => values[serviceId]) as ServiceId[],
};
