export function publicationOrigin(value: string): string {
  const input = value.trim();
  const host = input.includes(".") ? input : `${input}.substack.com`;
  let url: URL;
  try {
    url = new URL(host.startsWith("https://") ? host : `https://${host}`);
  } catch {
    throw new Error("Enter your publication's Substack subdomain or HTTPS URL.");
  }
  if (
    !/^[a-z0-9][a-z0-9-]*\.substack\.com$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("Use your publication's https://name.substack.com URL, without a path or custom domain.");
  }
  return url.origin;
}

function cookieValue(value: string): string {
  const cookie = value.trim();
  if (!cookie || /[\s;\r\n]/.test(cookie) || /^(substack|connect)\.sid=/.test(cookie)) {
    throw new Error("Paste only the session cookie value in Manage Accounts, without its name or other cookies.");
  }
  return cookie;
}

export function createSubstackClient(account: { publication: string; sessionCookie: string; connectCookie?: string }) {
  const origin = publicationOrigin(account.publication);
  const cookies = [`substack.sid=${cookieValue(account.sessionCookie)}`];
  if (account.connectCookie?.trim()) cookies.push(`connect.sid=${cookieValue(account.connectCookie)}`);

  async function request<T>(path: string, method = "GET", payload?: unknown): Promise<T> {
    // No retries: a timed-out write may already have created a draft. Never forward credentials on redirects.
    let response: Response;
    try {
      response = await fetch(`${origin}/api/v1/${path}`, {
        method,
        redirect: "error",
        headers: { Cookie: cookies.join("; "), "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error("Could not reach Substack. Check your connection and Substack drafts before trying again.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Substack denied access. Refresh your session cookies in Manage Accounts and check that you can write to this publication.",
      );
    }
    if (!response.ok)
      throw new Error(`Substack returned HTTP ${response.status}. Check your drafts before trying again.`);
    try {
      return (await response.json()) as T;
    } catch {
      throw new Error("Substack returned an unexpected response. Check your drafts before trying again.");
    }
  }

  return { origin, request };
}
