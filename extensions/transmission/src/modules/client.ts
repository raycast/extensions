import { getPreferenceValues } from "@raycast/api";
import Transmission from "transmission-promise";

const preferences = getPreferenceValues();
export const createClient = (): Transmission => {
  return new Transmission({
    host: preferences.host,
    port: Number(preferences.port),
    username: preferences.username,
    password: preferences.password,
    ssl: preferences.ssl,
  });
};
