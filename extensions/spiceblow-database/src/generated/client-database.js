import { createSpiceflowClient } from "spiceflow/client";
export function createClient({ url, fetch, googleToken }) {
  const client = createSpiceflowClient(url, {
    headers() {
      return {
        googleToken: googleToken(),
      };
    },
    fetch,
  });
  return client;
}
