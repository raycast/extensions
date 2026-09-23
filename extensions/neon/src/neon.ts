import { createNeonClient } from "@neon/sdk";
import { createApiClient } from "@neondatabase/api-client";
import { getPreferenceValues } from "@raycast/api";

const apiKey = getPreferenceValues<Preferences>().api_key;
export const neon = createNeonClient({
  apiKey,
  throwOnError: true,
});
export const client = createApiClient({
  apiKey,
});
client.instance.interceptors.response.use(
  (res) => res,
  (err) => {
    return Promise.reject(err.response.data.message);
  },
);
