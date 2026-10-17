/** Tipos de token pelo prefixo documentado pelo GitHub. */
const KINDS: { prefix: string; label: string }[] = [
  { prefix: "github_pat_", label: "Fine-grained" },
  { prefix: "ghp_", label: "Classic" },
  { prefix: "gho_", label: "OAuth" },
  { prefix: "ghu_", label: "App (usuário)" },
  { prefix: "ghs_", label: "App (servidor)" },
  { prefix: "ghr_", label: "Refresh" },
];

export function tokenKind(token: string): string {
  return KINDS.find((k) => token.startsWith(k.prefix))?.label ?? "Outro";
}

/** Mostra o prefixo e os 4 últimos caracteres; o resto vira bolinha. */
export function maskToken(token: string): string {
  const kind = KINDS.find((k) => token.startsWith(k.prefix));
  const prefix = kind?.prefix ?? "";
  const tail = token.length > prefix.length + 8 ? token.slice(-4) : "";
  return `${prefix}${"•".repeat(10)}${tail}`;
}

export type VerifyResult =
  | {
      ok: true;
      login: string;
      name: string | null;
      scopes: string | null;
      expiresAt: string | null;
      rateRemaining: string | null;
      rateLimit: string | null;
    }
  | { ok: false; status: number; message: string };

/** Pergunta ao GitHub de quem é o token. Só roda quando você pede. */
export async function verifyToken(token: string): Promise<VerifyResult> {
  let res: Response;
  try {
    res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "raycast-github-tokens",
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "Sem resposta do GitHub em 10 s." : String(e);
    return { ok: false, status: 0, message: msg };
  }

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // corpo vazio ou não-JSON: fica o statusText
    }
    if (res.status === 401) message = "Token inválido, revogado ou expirado.";
    return { ok: false, status: res.status, message };
  }

  const body = (await res.json()) as { login: string; name?: string | null };
  return {
    ok: true,
    login: body.login,
    name: body.name ?? null,
    scopes: res.headers.get("x-oauth-scopes"),
    expiresAt: res.headers.get("github-authentication-token-expiration"),
    rateRemaining: res.headers.get("x-ratelimit-remaining"),
    rateLimit: res.headers.get("x-ratelimit-limit"),
  };
}
