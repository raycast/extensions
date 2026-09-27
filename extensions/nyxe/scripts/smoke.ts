/**
 * End-to-end smoke test against a real Nyxe deployment — DEV, never prod.
 *
 *   NYXE_API_TOKEN=nyxe_pat_… NYXE_API_BASE_URL=https://convex-site-dev.nyxe.app npm run smoke
 *
 * Exercises /me, /search, /inbox/summary, /codes/latest, then sends one email
 * to the token owner's own primary address. Exits non-zero on any failure.
 * Runs on Node's built-in TypeScript stripping (Node ≥ 22.18), so it needs
 * nothing beyond the extension's own dependencies.
 */
import { createClient, NyxeApiError } from "../src/lib/api.ts";
import { smokeBaseUrl } from "../src/lib/smokeTarget.ts";

const token = process.env.NYXE_API_TOKEN;
const baseUrl = smokeBaseUrl(process.env.NYXE_API_BASE_URL);

if (!token || !process.env.NYXE_API_BASE_URL) {
  console.error("Set NYXE_API_TOKEN and NYXE_API_BASE_URL (the dev deployment).");
  process.exit(2);
}
if (!baseUrl) {
  console.error(
    "NYXE_API_BASE_URL must be exactly https://convex-site-dev.nyxe.app or a localhost backend. The smoke test never runs against production.",
  );
  process.exit(2);
}

const client = createClient({ token, baseUrl });
let failed = 0;

async function step<T>(name: string, run: () => Promise<T>, summarize: (value: T) => string): Promise<T | undefined> {
  const started = Date.now();
  try {
    const value = await run();
    console.log(`✓ ${name} (${Date.now() - started}ms) ${summarize(value)}`);
    return value;
  } catch (err) {
    failed += 1;
    const detail = err instanceof NyxeApiError ? `${err.status} ${err.code}: ${err.message}` : String(err);
    console.log(`✗ ${name} (${Date.now() - started}ms) ${detail}`);
    return undefined;
  }
}

const me = await step(
  "GET /me",
  () => client.me(),
  (m) => `user=${m.user.email} scopes=${m.token.scopes.join(",")}`,
);
await step(
  "GET /search",
  () => client.search("the", { limit: 5 }),
  (p) => `results=${p.results.length} total=${p.total}`,
);
await step(
  "GET /inbox/summary",
  () => client.inboxSummary(),
  (s) => `unread=${s.unread} threads=${s.threads.length}`,
);
await step(
  "GET /codes/latest",
  () => client.latestSignIn({ withinMinutes: 60 }),
  (m) => (m ? `match from=${m.from?.email} code=${m.code ? "yes" : "no"} link=${m.link ? "yes" : "no"}` : "no match"),
);
if (me?.addresses.primary) {
  const stamp = new Date().toISOString();
  await step(
    "POST /send (to self)",
    () =>
      client.send({
        to: [me.addresses.primary],
        subject: `Nyxe Raycast smoke test ${stamp}`,
        text: `Sent by integrations/raycast/scripts/smoke.ts at ${stamp}.`,
      }),
    (r) => `emailId=${r.emailId} threadId=${r.threadId}`,
  );
} else {
  failed += 1;
  console.log("✗ POST /send skipped: /me returned no primary address");
}

console.log(failed ? `\n${failed} step(s) failed` : "\nAll steps passed");
process.exit(failed ? 1 : 0);
