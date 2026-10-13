import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { claudeHome } from "./paths";

/**
 * Credencial OAuth do Claude Code — ler E renovar.
 *
 * REGRA DA CASA: quem depende de um token tem que saber renova-lo.
 *
 * Ate aqui a extensao so LIA `.claude/.credentials.json`. O token de acesso
 * dura ~8 horas; quem o renova e o proprio Claude Code, quando roda. Toda vez
 * que o Owner passava horas sem abrir o Claude Code, a extensao amanhecia
 * dizendo "o token venceu" / "a API recusou (401)" e nao havia nada a fazer
 * DENTRO do Raycast: era preciso abrir o Claude Code so para destravar a
 * leitura. Medido em 18/08/2026: a barra ficou muda das 22:17 as 11:41.
 *
 * Agora a extensao faz o mesmo fluxo que o Claude Code faz — `grant_type:
 * refresh_token` contra o TOKEN_URL oficial, com o client_id do Claude Code —
 * e grava o resultado de volta no MESMO arquivo.
 *
 * Gravar de volta nao e opcional: o servidor ROTACIONA o refresh token. Se
 * renovassemos e guardassemos o token novo so aqui, o Claude Code ficaria com
 * um refresh token ja invalidado — ou seja, quebrariamos o login que viemos
 * consertar. Dai as tres travas abaixo:
 *
 *  1. TRAVA DE ARQUIVO — os dois comandos (janela e barra) rodam em processos
 *     separados e a barra acorda de 10 em 10 min. Sem trava, dois refreshes
 *     simultaneos gastariam o mesmo refresh token duas vezes e o segundo
 *     tomaria `invalid_grant`.
 *  2. RELEITURA DEPOIS DA TRAVA — se o outro processo ja renovou enquanto
 *     esperavamos, aproveitamos o token dele em vez de queimar outro.
 *  3. GRAVACAO ATOMICA — arquivo temporario + `rename`. Nunca deixamos
 *     `.credentials.json` pela metade: um arquivo truncado aqui derruba o
 *     login do Claude Code inteiro.
 *
 * NUNCA registrar o token em log, toast ou mensagem de erro. Os erros daqui
 * carregam somente codigo de status.
 */

/** Endpoint e client_id lidos do proprio binario do Claude Code (TOKEN_URL, CLIENT_ID). */
const TOKEN_URL = "https://platform.claude.com/v1/oauth/token";
const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";

const REFRESH_TIMEOUT_MS = 30_000;
/** Renova 5 min antes de vencer, para nao gastar uma ida a API so para tomar 401. */
const EARLY_MS = 5 * 60_000;
/** Trava mais velha que isto e trava orfa (processo morreu no meio). */
const LOCK_STALE_MS = 60_000;
/** Quanto esperamos o outro processo terminar o refresh dele. */
const LOCK_WAIT_MS = 8_000;
const LOCK_POLL_MS = 250;

export type Credential = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  scopes: string[];
};

/** Motivo em portugues, pronto para a interface. Nunca contem o token. */
export class CredentialError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.name = "CredentialError";
    this.reason = reason;
  }
}

function credentialsFile(): string {
  return path.join(claudeHome(), ".claude", ".credentials.json");
}

function lockFile(): string {
  return path.join(environment.supportPath, "refresh.lock");
}

type RawFile = { claudeAiOauth?: Record<string, unknown> } & Record<string, unknown>;

async function readRaw(): Promise<RawFile | null> {
  try {
    return JSON.parse(await readFile(credentialsFile(), "utf8")) as RawFile;
  } catch {
    return null;
  }
}

function credentialFrom(raw: RawFile | null): Credential | null {
  const oauth = raw?.claudeAiOauth;
  const accessToken = oauth?.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) return null;
  const rawScopes = oauth?.scopes;
  const scopes = Array.isArray(rawScopes) ? rawScopes.filter((s): s is string => typeof s === "string") : [];
  return {
    accessToken,
    refreshToken: typeof oauth?.refreshToken === "string" ? oauth.refreshToken : null,
    expiresAt: Number(oauth?.expiresAt ?? 0),
    scopes,
  };
}

export function isUsable(c: Credential): boolean {
  return !c.expiresAt || c.expiresAt > Date.now() + EARLY_MS;
}

export async function readCredential(): Promise<Credential | null> {
  return credentialFrom(await readRaw());
}

// ---------------------------------------------------------------------------
// Trava entre processos
// ---------------------------------------------------------------------------

async function acquireLock(): Promise<boolean> {
  const file = lockFile();
  const deadline = Date.now() + LOCK_WAIT_MS;

  for (;;) {
    try {
      // `wx` falha se o arquivo ja existe: e isso que torna a trava atomica.
      await writeFile(file, String(Date.now()), { flag: "wx" });
      return true;
    } catch {
      let age = Number.POSITIVE_INFINITY;
      try {
        age = Date.now() - Number(await readFile(file, "utf8"));
      } catch {
        // trava sumiu entre o erro e a leitura: tenta pegar de novo
      }
      if (!Number.isFinite(age) || age > LOCK_STALE_MS) {
        await rm(file, { force: true });
        continue;
      }
      if (Date.now() >= deadline) return false;
      await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
    }
  }
}

async function releaseLock(): Promise<void> {
  await rm(lockFile(), { force: true });
}

// ---------------------------------------------------------------------------
// Renovacao
// ---------------------------------------------------------------------------

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  /** Validade do refresh token (~28 dias). O Claude Code grava a mesma conta. */
  refresh_token_expires_in?: number;
  scope?: string;
};

async function requestNewToken(c: Credential): Promise<TokenResponse> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: c.refreshToken,
      client_id: CLIENT_ID,
      ...(c.scopes.length ? { scope: c.scopes.join(" ") } : {}),
    }),
    signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new CredentialError(
      response.status === 400 || response.status === 401
        ? "A renovacao do login foi recusada. Rode `claude /login` uma vez."
        : `A renovacao do login respondeu ${response.status}.`,
    );
  }
  return (await response.json()) as TokenResponse;
}

/**
 * Grava o token novo por cima do arquivo do Claude Code, preservando todo o
 * resto (`organizationUuid` e campos que uma versao nova do CLI venha a somar).
 * Temporario + `rename` para nunca existir um `.credentials.json` pela metade.
 */
async function persist(token: TokenResponse, previous: Credential): Promise<Credential> {
  const raw = (await readRaw()) ?? {};
  const oauth: Record<string, unknown> = { ...(raw.claudeAiOauth ?? {}) };

  // Espelhar, nunca reinterpretar: cada campo sai do que a resposta trouxe.
  // Campo ausente = campo preservado, que e como o proprio Claude Code trata
  // um `refresh_token` omitido (o servidor pode nao rotacionar).
  oauth.accessToken = token.access_token;
  if (token.refresh_token) oauth.refreshToken = token.refresh_token;
  if (typeof token.expires_in === "number") oauth.expiresAt = Date.now() + token.expires_in * 1000;
  if (typeof token.refresh_token_expires_in === "number") {
    oauth.refreshTokenExpiresAt = Date.now() + token.refresh_token_expires_in * 1000;
  }
  if (token.scope) oauth.scopes = token.scope.split(" ").filter(Boolean);

  const next: RawFile = { ...raw, claudeAiOauth: oauth };
  const target = credentialsFile();
  const temp = `${target}.raycast.tmp`;
  await writeFile(temp, JSON.stringify(next, null, 2), "utf8");
  await rename(temp, target);

  return credentialFrom(next) ?? previous;
}

/**
 * Renova de verdade. Assume que o chamador ja decidiu que precisa.
 * A trava e a releitura evitam gastar dois refresh tokens pelo mesmo motivo.
 */
export async function refreshCredential(): Promise<Credential> {
  const current = await readCredential();
  if (!current) throw new CredentialError("Nao encontrei .claude/.credentials.json — faca login no Claude Code.");
  if (!current.refreshToken) {
    throw new CredentialError("O login do Claude Code nao tem token de renovacao. Rode `claude /login`.");
  }

  const locked = await acquireLock();
  try {
    // O outro comando pode ter renovado enquanto esperavamos a trava.
    const fresh = await readCredential();
    if (fresh && fresh.accessToken !== current.accessToken && isUsable(fresh)) return fresh;
    if (!locked) {
      throw new CredentialError("Outra janela esta renovando o login. Tente de novo em alguns segundos.");
    }

    const base = fresh ?? current;
    const token = await requestNewToken(base);
    if (!token.access_token) throw new CredentialError("A renovacao do login voltou sem token.");
    return await persist(token, base);
  } finally {
    if (locked) await releaseLock();
  }
}

/**
 * O que os leitores de limite usam: um token bom, renovando sozinho se preciso.
 * `force` e para o caso de 401 — o arquivo pode dizer que o token vale e o
 * servidor discordar (revogacao, troca de conta).
 */
export async function usableAccessToken(options: { force?: boolean } = {}): Promise<string> {
  const current = await readCredential();
  if (!current) throw new CredentialError("Nao encontrei .claude/.credentials.json — faca login no Claude Code.");
  if (!options.force && isUsable(current)) return current.accessToken;
  return (await refreshCredential()).accessToken;
}
