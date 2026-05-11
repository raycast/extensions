import { createApiClient } from "@neondatabase/api-client";
import { getPreferenceValues } from "@raycast/api";

export const neon = createApiClient({
  apiKey: getPreferenceValues<Preferences>().api_key,
});
neon.instance.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err.response.data.message);
  },
);
