import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { environment } from "@raycast/api";
import { CredentialError, usableAccessToken } from "./credentials";
import { claudeHome } from "./paths";

/**
 * Limites do plano e creditos extras.
 *
 * REGRA DA CASA: espelhar, nunca reinterpretar.
 *
 * Toda vez que este arquivo traduziu um campo da API para uma ideia propria, a
 * extensao passou a mostrar coisa diferente do claude.ai. Ja aconteceu duas
 * vezes:
 *
 *  1. Ler `cachedUsageUtilization` do `.claude.json` como se fosse o numero de
 *     agora — era um cache de horas atras.
 *  2. Ler `spend.enabled` como "o usuario ligou os creditos extras" — nao e.
 *     Esse campo diz apenas se HA COMO GASTAR NESTE INSTANTE. O liga/desliga
 *     que o site mostra e `organization.has_extra_usage_enabled`, do endpoint
 *     `/api/oauth/profile`. Com credito zerado a API manda
 *     `spend.enabled=false` e o perfil manda `has_extra_usage_enabled=true`:
 *     ligado, mas sem saldo. A extensao dizia "desativados" e escondia o valor.
 *
 * Por isso os dois endpoints sao lidos juntos, os valores de dinheiro sao
 * sempre expostos (nunca condicionados a um flag), e `.verify/sync.ts` compara
 * campo a campo o que a interface mostra com o que a API devolveu.
 */

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const PROFILE_URL = "https://api.anthropic.com/api/oauth/profile";
const OAUTH_BETA = "oauth-2025-04-20";
/** Janela em que reaproveitamos a ultima resposta, para os dois comandos nao baterem na API em duplicidade. */
const MEMO_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;

export type LimitWindow = {
  kind: string;
  group: string;
  label: string;
  percent: number;
  severity: string;
  resetsAt: Date | null;
  isActive: boolean;
  scopeLabel: string | null;
};

export type Spend = {
  /**
   * O liga/desliga que aparece no claude.ai, vindo de
   * `/api/oauth/profile` → `organization.has_extra_usage_enabled`.
   * `null` quando o perfil nao pode ser lido (nunca inventamos o valor).
   */
  configuredOn: boolean | null;
  /** `spend.enabled` da API: da para gastar AGORA. Nao e o liga/desliga. */
  spendableNow: boolean;
  /** O usuario desligou de proposito. */
  userDisabled: boolean;
  /** Bateu o teto mensal. */
  spendLimitReached: boolean;
  /** Ja usou credito extra alguma vez (a API chama de `credits_ever_enabled`). */
  everEnabled: boolean;
  usedMinor: number;
  limitMinor: number;
  currency: string;
  exponent: number;
  percent: number;
  /** Codigo cru da API (`out_of_credits`, `spend_limit_reached`, ...). */
  disabledReason: string | null;
  canPurchase: boolean;
};

export type LimitsSource = "live" | "memo" | "cache" | "none";

export type PlanLimits = {
  source: LimitsSource;
  fetchedAt: Date | null;
  /** Preenchido quando a leitura ao vivo falhou, para a interface explicar o porque. */
  problem: string | null;
  account: { email?: string; displayName?: string; orgType?: string; rateLimitTier?: string } | null;
  windows: LimitWindow[];
  spend: Spend | null;
};

const KIND_LABELS: Record<string, string> = {
  session: "Janela de 5 horas",
  weekly_all: "Semanal (todos os modelos)",
  weekly_scoped: "Semanal (modelo especifico)",
  weekly_opus: "Semanal (Opus)",
  weekly_sonnet: "Semanal (Sonnet)",
  weekly_oauth_apps: "Semanal (apps OAuth)",
};

/** Codigos que a API manda em `disabled_reason`, em portugues. */
const REASON_LABELS: Record<string, string> = {
  out_of_credits: "sem saldo de credito",
  spend_limit_reached: "teto mensal atingido",
  user_disabled: "desligado por voce",
  no_payment_method: "sem forma de pagamento",
  payment_failed: "pagamento recusado",
};

export function reasonLabel(code: string | null): string | null {
  if (!code) return null;
  return REASON_LABELS[code] ?? code.replace(/_/g, " ");
}

type RawLimit = {
  kind?: string;
  group?: string;
  percent?: number;
  severity?: string;
  resets_at?: string | null;
  is_active?: boolean;
  scope?: { model?: { id?: string | null; display_name?: string | null } | null } | null;
};

type RawUsage = {
  limits?: RawLimit[];
  five_hour?: { utilization?: number; resets_at?: string | null } | null;
  seven_day?: { utilization?: number; resets_at?: string | null } | null;
  spend?: {
    used?: { amount_minor?: number; currency?: string; exponent?: number };
    limit?: { amount_minor?: number; currency?: string; exponent?: number };
    percent?: number;
    enabled?: boolean;
    disabled_reason?: string | null;
    can_purchase_credits?: boolean;
  } | null;
  extra_usage?: {
    is_enabled?: boolean;
    monthly_limit?: number;
    used_credits?: number;
    utilization?: number;
    currency?: string;
    decimal_places?: number;
    disabled_reason?: string | null;
    user_disabled?: boolean;
    spend_limit_reached?: boolean;
    credits_ever_enabled?: boolean;
  } | null;
};

type RawProfile = {
  account?: { email?: string; display_name?: string };
  organization?: {
    organization_type?: string;
    rate_limit_tier?: string;
    has_extra_usage_enabled?: boolean;
  };
};

function labelFor(raw: RawLimit): string {
  const base = KIND_LABELS[raw.kind ?? ""] ?? raw.kind ?? "Limite";
  const model = raw.scope?.model?.display_name ?? raw.scope?.model?.id;
  return model ? `${base} — ${model}` : base;
}

function windowsFrom(raw: RawUsage): LimitWindow[] {
  const list = (raw.limits ?? [])
    .filter((l) => typeof l.percent === "number")
    .map((l) => ({
      kind: l.kind ?? "unknown",
      group: l.group ?? "outros",
      label: labelFor(l),
      percent: l.percent ?? 0,
      severity: l.severity ?? "normal",
      resetsAt: l.resets_at ? new Date(l.resets_at) : null,
      isActive: Boolean(l.is_active),
      scopeLabel: l.scope?.model?.display_name ?? l.scope?.model?.id ?? null,
    }));

  if (list.length > 0) return list;

  // Versao antiga da resposta: reconstroi as duas janelas principais.
  const fallback: LimitWindow[] = [];
  for (const [key, kind] of [
    ["five_hour", "session"],
    ["seven_day", "weekly_all"],
  ] as const) {
    const w = raw[key];
    if (w && typeof w.utilization === "number") {
      fallback.push({
        kind,
        group: kind === "session" ? "session" : "weekly",
        label: KIND_LABELS[kind],
        percent: Math.round(w.utilization),
        severity: "normal",
        resetsAt: w.resets_at ? new Date(w.resets_at) : null,
        isActive: true,
        scopeLabel: null,
      });
    }
  }
  return fallback;
}

/**
 * Monta os creditos a partir de `spend` (nome novo) ou `extra_usage` (nome
 * antigo, tambem usado pelo cache do Claude Code). Os dois trazem os mesmos
 * numeros; `extra_usage` traz de quebra `user_disabled` e `spend_limit_reached`,
 * que separam "voce desligou" de "acabou o saldo".
 *
 * `configuredOn` NAO sai daqui: vem do perfil, que e a fonte do site.
 */
function spendFrom(raw: RawUsage, configuredOn: boolean | null): Spend | null {
  const s = raw.spend;
  const e = raw.extra_usage;
  if (!s?.used && !s?.limit && !e) return null;

  const currency = s?.used?.currency ?? s?.limit?.currency ?? e?.currency ?? "USD";
  const exponent = s?.used?.exponent ?? s?.limit?.exponent ?? e?.decimal_places ?? 2;

  // `used_credits` e `monthly_limit` de `extra_usage` ja vem em unidade menor
  // (centavos), na mesma escala de `amount_minor`. Nao converter.
  const usedMinor = s?.used?.amount_minor ?? e?.used_credits ?? 0;
  const limitMinor = s?.limit?.amount_minor ?? e?.monthly_limit ?? 0;
  const percent = s?.percent ?? (e?.utilization !== undefined ? Math.round(e.utilization) : 0);
  const reason = s?.disabled_reason ?? e?.disabled_reason ?? null;

  return {
    configuredOn,
    spendableNow: Boolean(s?.enabled ?? e?.is_enabled),
    userDisabled: Boolean(e?.user_disabled ?? reason === "user_disabled"),
    spendLimitReached: Boolean(e?.spend_limit_reached ?? reason === "spend_limit_reached"),
    everEnabled: Boolean(e?.credits_ever_enabled ?? usedMinor > 0),
    usedMinor,
    limitMinor,
    currency,
    exponent,
    percent,
    disabledReason: reason,
    canPurchase: Boolean(s?.can_purchase_credits),
  };
}

/**
 * A frase que descreve o estado dos creditos, na mesma leitura do site.
 *
 * `on`      — ligados e com saldo
 * `blocked` — ligados, mas travados agora (sem saldo, teto batido)
 * `off`     — desligados de verdade
 */
export function spendStatus(s: Spend): { label: string; tone: "on" | "off" | "blocked" } {
  const reason = reasonLabel(s.disabledReason);

  if (s.userDisabled) return { label: "desligados por voce", tone: "off" };
  if (s.configuredOn === false) return { label: "desligados na conta", tone: "off" };

  if (s.spendableNow) return { label: "ligados", tone: "on" };

  if (s.configuredOn === true) {
    return { label: reason ? `ligados, travados agora — ${reason}` : "ligados, travados agora", tone: "blocked" };
  }
  // Perfil nao lido: nao afirmamos liga/desliga, so o que a API garantiu.
  return { label: reason ? `sem gastar agora — ${reason}` : "sem gastar agora", tone: "blocked" };
}

/**
 * As frases prontas dos creditos, em UM lugar so.
 *
 * A janela e a barra consomem daqui, e `.verify/sync.ts` confere daqui contra a
 * resposta crua da API. Enquanto as tres bocas comerem da mesma funcao, nao ha
 * como uma tela dizer uma coisa e o site outra.
 */
export function spendSummary(s: Spend): {
  used: string;
  cap: string;
  status: string;
  tone: "on" | "off" | "blocked";
  /** Linha unica: "R$ 57,25 de R$ 110,00 · ligados, travados agora — sem saldo de credito" */
  subtitle: string;
} {
  const used = moneyMinor(s.usedMinor, s.currency, s.exponent);
  const cap = moneyMinor(s.limitMinor, s.currency, s.exponent);
  const { label, tone } = spendStatus(s);
  return { used, cap, status: label, tone, subtitle: `${used} de ${cap} · ${label}` };
}

// ---------------------------------------------------------------------------
// Memo em disco (evita duas chamadas seguidas quando janela e barra abrem juntas)
// ---------------------------------------------------------------------------

type Memo = { at: number; body: RawUsage; profile?: RawProfile | null };

function memoPath(): string {
  return path.join(environment.supportPath, "limits-live.json");
}

async function readMemo(): Promise<Memo | null> {
  try {
    return JSON.parse(await readFile(memoPath(), "utf8")) as Memo;
  } catch {
    return null;
  }
}

async function writeMemo(body: RawUsage, profile: RawProfile | null): Promise<void> {
  try {
    await mkdir(environment.supportPath, { recursive: true });
    await writeFile(memoPath(), JSON.stringify({ at: Date.now(), body, profile } satisfies Memo), "utf8");
  } catch {
    // memo e otimizacao; falhar aqui nao pode derrubar a leitura
  }
}

// ---------------------------------------------------------------------------
// Cache do proprio Claude Code (recuo)
// ---------------------------------------------------------------------------

async function readClaudeJson(): Promise<{
  raw: RawUsage | null;
  fetchedAt: Date | null;
  account: PlanLimits["account"];
}> {
  try {
    const parsed = JSON.parse(await readFile(path.join(claudeHome(), ".claude.json"), "utf8"));
    const cached = parsed.cachedUsageUtilization as { fetchedAtMs?: number; utilization?: RawUsage } | undefined;
    const oauth = parsed.oauthAccount as Record<string, string> | undefined;
    return {
      raw: cached?.utilization ?? null,
      fetchedAt: cached?.fetchedAtMs ? new Date(cached.fetchedAtMs) : null,
      account: oauth
        ? {
            email: oauth.emailAddress,
            displayName: oauth.displayName,
            orgType: oauth.organizationType,
            rateLimitTier: oauth.organizationRateLimitTier,
          }
        : null,
    };
  } catch {
    return { raw: null, fetchedAt: null, account: null };
  }
}

function accountFrom(profile: RawProfile | null | undefined): PlanLimits["account"] | null {
  if (!profile?.account && !profile?.organization) return null;
  return {
    email: profile.account?.email,
    displayName: profile.account?.display_name,
    orgType: profile.organization?.organization_type,
    rateLimitTier: profile.organization?.rate_limit_tier,
  };
}

function configuredOnFrom(profile: RawProfile | null | undefined): boolean | null {
  const value = profile?.organization?.has_extra_usage_enabled;
  return typeof value === "boolean" ? value : null;
}

// ---------------------------------------------------------------------------
// Leitura publica
// ---------------------------------------------------------------------------

type ApiAttempt = { status: number; body: RawUsage | null; profile: RawProfile | null };

/**
 * Uma ida a API com um token. Devolve o status para o chamador decidir se vale
 * renovar e repetir — quem renova e `credentials.ts`, nao este arquivo.
 *
 * O perfil e opcional: se falhar, os limites ainda saem e o liga/desliga dos
 * creditos fica `null` em vez de virar um chute.
 */
async function callApi(accessToken: string): Promise<ApiAttempt> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "anthropic-beta": OAUTH_BETA,
    Accept: "application/json",
  };
  const get = (url: string) => fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });

  const [usageResult, profileResult] = await Promise.allSettled([get(USAGE_URL), get(PROFILE_URL)]);
  if (usageResult.status === "rejected") throw usageResult.reason;
  const response = usageResult.value;

  let profile: RawProfile | null = null;
  if (profileResult.status === "fulfilled" && profileResult.value.ok) {
    profile = (await profileResult.value.json()) as RawProfile;
  }

  if (!response.ok) return { status: response.status, body: null, profile };
  return { status: response.status, body: (await response.json()) as RawUsage, profile };
}

export type ReadOptions = { force?: boolean };

export async function readPlanLimits(options: ReadOptions = {}): Promise<PlanLimits> {
  const fallbackAccount = (await readClaudeJson()).account;

  if (!options.force) {
    const memo = await readMemo();
    if (memo && Date.now() - memo.at < MEMO_MS) {
      return {
        source: "memo",
        fetchedAt: new Date(memo.at),
        problem: null,
        account: accountFrom(memo.profile) ?? fallbackAccount,
        windows: windowsFrom(memo.body),
        spend: spendFrom(memo.body, configuredOnFrom(memo.profile)),
      };
    }
  }

  let problem: string | null = null;

  try {
    // Primeira tentativa com o token do arquivo (renovado aqui mesmo se ja
    // estiver perto de vencer). Se o servidor devolver 401 assim mesmo — token
    // revogado, conta trocada — forcamos UMA renovacao e repetimos. Duas
    // tentativas no maximo: a terceira so gastaria refresh token a toa.
    let attempt = await callApi(await usableAccessToken());

    if (attempt.status === 401) {
      attempt = await callApi(await usableAccessToken({ force: true }));
    }

    if (attempt.body) {
      await writeMemo(attempt.body, attempt.profile);
      return {
        source: "live",
        fetchedAt: new Date(),
        problem: null,
        account: accountFrom(attempt.profile) ?? fallbackAccount,
        windows: windowsFrom(attempt.body),
        spend: spendFrom(attempt.body, configuredOnFrom(attempt.profile)),
      };
    }

    problem =
      attempt.status === 401
        ? "A API recusou o token mesmo depois de renovar. Rode `claude /login`."
        : `A API respondeu ${attempt.status}.`;
  } catch (error) {
    // CredentialError ja vem em portugues e sem token dentro.
    if (error instanceof CredentialError) problem = error.reason;
    else problem = error instanceof Error ? `Falha de rede: ${error.message}` : "Falha de rede.";
  }

  // Recuo: cache do proprio Claude Code, com a idade exposta.
  const cached = await readClaudeJson();
  if (cached.raw) {
    return {
      source: "cache",
      fetchedAt: cached.fetchedAt,
      problem,
      account: cached.account,
      windows: windowsFrom(cached.raw),
      // Sem perfil ao vivo nao ha como afirmar liga/desliga: fica `null`.
      spend: spendFrom(cached.raw, null),
    };
  }

  return { source: "none", fetchedAt: null, problem, account: fallbackAccount, windows: [], spend: null };
}

export function moneyMinor(amountMinor: number, currency: string, exponent: number): string {
  const value = amountMinor / 10 ** exponent;
  try {
    return value.toLocaleString("pt-BR", { style: "currency", currency });
  } catch {
    return `${currency} ${value.toFixed(exponent)}`;
  }
}

export function sourceLabel(limits: PlanLimits): string {
  switch (limits.source) {
    case "live":
      return "ao vivo, direto da API";
    case "memo":
      return "ao vivo (resposta de menos de 1 min)";
    case "cache":
      return "cache do Claude Code";
    default:
      return "sem leitura";
  }
}
