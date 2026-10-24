// IconOven Pro for Raycast: checks the licence key from preferences and loads the style roles it unlocks
// (the same calls as the VS Code extension). Nothing Pro is bundled; it comes from iconoven.com.
const API = "https://iconoven.com";
const KEY_RE = /^iok_[0-9A-Za-z]{32}$/;

const REASONS: Record<string, string> = {
  bad_key: "A key is iok_ followed by 32 letters and numbers.",
  unknown_key: "That key isn't one of ours. Copy it again from your order page.",
  revoked: "This licence was refunded or cancelled, so the key no longer works.",
  ci_key_surface: "That's a CI key; it only works with the package registries. Use one of your seat keys.",
};

export type ProResult = { roles: Record<string, string> } | { error: string };

/** Verifies the key, then loads roles.json (about 1 MB). Never throws; a failure comes back as { error }. */
export async function loadPro(key: string): Promise<ProResult> {
  if (!KEY_RE.test(key)) return { error: REASONS.bad_key };
  const auth = { authorization: `Bearer ${key}` };
  try {
    const v = await fetch(`${API}/api/v1/licence/verify`, {
      method: "POST",
      headers: { ...auth, "content-type": "application/json" },
      body: JSON.stringify({ key, surface: "web" }),
    });
    const verdict = (await v.json().catch(() => ({}))) as { valid?: boolean; reason?: string };
    if (!verdict.valid) return { error: (verdict.reason && REASONS[verdict.reason]) || "That key doesn't unlock Pro." };
    const r = await fetch(`${API}/api/v1/icons/pro/roles.json?surface=web`, { headers: auth });
    if (!r.ok) return { error: `Couldn't load the Pro styles (HTTP ${r.status}). Try again later.` };
    return { roles: ((await r.json()) as { icons: Record<string, string> }).icons };
  } catch {
    return { error: "Couldn't reach iconoven.com. Check your connection and try again." };
  }
}
