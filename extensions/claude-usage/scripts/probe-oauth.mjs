// Probe the Claude Code OAuth path end-to-end:
//   1. read 'Claude Code-credentials' from the macOS Keychain (may or may not prompt)
//   2. call the official GET /api/oauth/usage endpoint as Claude Code does
// Prints usage data (your own limit percentages) + token prefix/expiry only —
// never the full access/refresh token.

import { execFileSync } from "node:child_process";

// --- 1. Keychain read ----------------------------------------------------
let cred;
try {
  const raw = execFileSync(
    "/usr/bin/security",
    ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
    { encoding: "utf8" },
  ).trim();
  cred = JSON.parse(raw);
  console.log(
    "✅ Keychain read OK — no wall on 'Claude Code-credentials' on this Mac.",
  );
} catch (e) {
  console.log(
    "❌ Could not read 'Claude Code-credentials':",
    e.message.split("\n")[0],
  );
  console.log(
    "   If a password dialog appeared that you couldn't fill → same wall as the Claude app.",
  );
  console.log(
    "   If it said 'item could not be found' → log in with the Claude Code CLI first.",
  );
  process.exit(1);
}

const oauth = cred.claudeAiOauth ?? cred;
const token = oauth.accessToken;
const exp = oauth.expiresAt;
console.log(
  "   accessToken:",
  String(token).slice(0, 16) + "…",
  "| scopes:",
  (oauth.scopes || []).join(",") || "n/a",
  "| subscription:",
  oauth.subscriptionType || "n/a",
);
if (exp) {
  const expired = exp < Date.now();
  console.log(
    "   expiresAt:",
    new Date(exp).toISOString(),
    expired ? "(EXPIRED → would need refresh)" : "(valid)",
  );
}

// --- 2. Usage call -------------------------------------------------------
console.log("\nGET https://api.anthropic.com/api/oauth/usage …");
const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
  headers: {
    Authorization: `Bearer ${token}`,
    "anthropic-beta": "oauth-2025-04-20",
    "User-Agent": "claude-code/2.1.72",
    Accept: "application/json",
  },
});
console.log("HTTP", res.status, res.statusText);
const text = await res.text();
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2));
} catch {
  console.log(text.slice(0, 2000));
}
if (res.status === 401 || res.status === 403) {
  console.log(
    "\n(401/403 → token likely expired; the real build would refresh via console.anthropic.com/v1/oauth/token.)",
  );
}
