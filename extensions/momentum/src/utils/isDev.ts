import { environment } from "@raycast/api";

export const isDev = () => {
  return environment.isDevelopment;
};
