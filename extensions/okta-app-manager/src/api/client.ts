import { getCurrentEnv } from "./config";

function prefs() {
  const current = getCurrentEnv();
  if (!current) {
    throw new Error("No Okta environment selected. Run 'Manage Environments' command first.");
  }
  return { oktaDomain: current.env.domain, oktaToken: current.env.token };
}

export function baseUrl(): string {
  const { oktaDomain } = prefs();
  const domain = oktaDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return `https://${domain}`;
}

export function adminBaseUrl(): string {
  const { oktaDomain } = prefs();
  const host = oktaDomain
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  const firstDot = host.indexOf(".");
  if (firstDot === -1) return `https://${host}-admin`;
  const sub = host.slice(0, firstDot);
  const rest = host.slice(firstDot + 1);
  return `https://${sub}-admin.${rest}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function oktaFetch(path: string, init?: RequestInit): Promise<any> {
  const { oktaToken } = prefs();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `SSWS ${oktaToken}`,
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const json = text ? safeJson(text) : null;

  if (!res.ok) {
    const msg = json?.errorSummary || json?.errorCauses?.[0]?.errorSummary || json?.errorCode || `HTTP ${res.status}`;
    const err = new Error(msg);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).status = res.status;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (err as any).body = json;
    throw err;
  }

  return json;
}
