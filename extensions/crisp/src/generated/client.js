import { hc } from "hono/client";
export function createClient({ url, session, supabaseRef, fetch }) {
  if (!session) {
    throw new Error("No session");
  }
  const client = hc(url, {
    fetch,
    headers() {
      return {
        Cookie: `sb-${supabaseRef}-auth-token=${encodeURIComponent(JSON.stringify(session))}`,
      };
    },
  });
  return client;
}
