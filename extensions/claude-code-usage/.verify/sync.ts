/**
 * Guarda de sincronia: confronta o que a extensao MOSTRA com o que a API
 * DEVOLVEU, campo a campo. Sai com codigo 1 na primeira divergencia.
 *
 * Existe porque a extensao ja divergiu do claude.ai duas vezes, sempre pelo
 * mesmo motivo: alguem reinterpretou um campo em vez de espelhar. Aqui a
 * reinterpretacao nao passa calada.
 *
 * Rodar: npm run verify:sync
 */

import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readPlanLimits, spendSummary } from "../src/lib/limits";

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const PROFILE_URL = "https://api.anthropic.com/api/oauth/profile";

type Raw = {
  limits?: Array<{
    kind?: string;
    percent?: number;
    resets_at?: string | null;
    is_active?: boolean;
    scope?: { model?: { id?: string | null; display_name?: string | null } | null } | null;
  }>;
  spend?: {
    used?: { amount_minor?: number; currency?: string; exponent?: number };
    limit?: { amount_minor?: number };
    percent?: number;
    enabled?: boolean;
    disabled_reason?: string | null;
  } | null;
};
type Profile = { organization?: { has_extra_usage_enabled?: boolean } };

const failures: string[] = [];
const checks: string[] = [];

/** Compara um campo aceitando qualquer uma das leituras cruas (a API muda entre chamadas). */
function same(name: string, shown: unknown, expected: unknown[]) {
  const ok = expected.some((e) => String(e) === String(shown));
  checks.push(`${ok ? "ok  " : "FALHA"} ${name.padEnd(38)} tela=${fmt(shown)}  api=${expected.map(fmt).join(" | ")}`);
  if (!ok) failures.push(`${name}: a tela mostra ${fmt(shown)}, a API devolveu ${expected.map(fmt).join(" ou ")}`);
}

function fmt(v: unknown): string {
  return v === null || v === undefined ? "—" : `«${String(v)}»`;
}

async function token(): Promise<string> {
  const file = path.join(process.env.CLAUDE_CONFIG_DIR?.trim() || os.homedir(), ".claude", ".credentials.json");
  const oauth = JSON.parse(await readFile(file, "utf8"))?.claudeAiOauth;
  if (!oauth?.accessToken) throw new Error(`sem accessToken em ${file}`);
  return String(oauth.accessToken);
}

async function get<T>(url: string, bearer: string): Promise<T> {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${bearer}`, "anthropic-beta": "oauth-2025-04-20", Accept: "application/json" },
  });
  if (!r.ok) throw new Error(`${url} respondeu ${r.status}`);
  return (await r.json()) as T;
}

(async () => {
  const bearer = await token();

  // Duas fotos da API em volta da leitura da extensao: o consumo anda entre as
  // chamadas, entao o valor da tela so precisa bater com uma das duas.
  const antes = await get<Raw>(USAGE_URL, bearer);
  const limits = await readPlanLimits({ force: true });
  const depois = await get<Raw>(USAGE_URL, bearer);
  const profile = await get<Profile>(PROFILE_URL, bearer);

  same("fonte da leitura", limits.source, ["live"]);
  if (limits.problem) failures.push(`leitura ao vivo reclamou: ${limits.problem}`);

  // --- janelas de limite ---
  const rawWindows = depois.limits ?? [];
  same("quantidade de janelas", limits.windows.length, [rawWindows.length]);

  for (const raw of rawWindows) {
    const scope = raw.scope?.model?.display_name ?? raw.scope?.model?.id ?? null;
    const shown = limits.windows.find((w) => w.kind === raw.kind && w.scopeLabel === scope);
    if (!shown) {
      failures.push(`janela ${raw.kind}${scope ? ` (${scope})` : ""}: a API devolveu, a tela nao mostra`);
      continue;
    }
    const gemeo = (antes.limits ?? []).find(
      (l) => l.kind === raw.kind && (l.scope?.model?.display_name ?? l.scope?.model?.id ?? null) === scope,
    );
    const nome = `${raw.kind}${scope ? `/${scope}` : ""}`;
    same(`janela ${nome} — percentual`, shown.percent, [raw.percent, gemeo?.percent]);
    // A API devolve o mesmo instante com milissegundo diferente a cada chamada
    // (…00.050Z, …00.391Z). A tela mostra ate o minuto: conferir ao segundo ja
    // e mais estrito do que o olho ve, sem acusar defeito onde nao ha.
    const aoSegundo = (d: Date | string | null | undefined) =>
      d ? new Date(d).toISOString().slice(0, 19) + "Z" : null;
    same(`janela ${nome} — reinicio`, aoSegundo(shown.resetsAt), [
      aoSegundo(raw.resets_at),
      aoSegundo(gemeo?.resets_at),
    ]);
    same(`janela ${nome} — ativa`, shown.isActive, [Boolean(raw.is_active), Boolean(gemeo?.is_active)]);
  }

  // --- creditos extras: onde a extensao ja divergiu ---
  const rawSpend = depois.spend;
  if (!rawSpend) {
    checks.push("ok   a API nao devolveu bloco `spend` nesta conta");
  } else if (!limits.spend) {
    failures.push("creditos: a API devolveu `spend`, a tela nao mostra nada");
  } else {
    const s = limits.spend;
    const view = spendSummary(s);

    same("creditos — gasto (centavos)", s.usedMinor, [rawSpend.used?.amount_minor, antes.spend?.used?.amount_minor]);
    same("creditos — teto (centavos)", s.limitMinor, [rawSpend.limit?.amount_minor]);
    same("creditos — moeda", s.currency, [rawSpend.used?.currency]);
    same("creditos — percentual", s.percent, [rawSpend.percent, antes.spend?.percent]);
    same("creditos — motivo do bloqueio", s.disabledReason, [rawSpend.disabled_reason ?? null]);
    same("creditos — da para gastar agora", s.spendableNow, [Boolean(rawSpend.enabled)]);
    // A regra que faltava: o liga/desliga do site NAO e `spend.enabled`.
    same("creditos — ligados na conta (perfil)", s.configuredOn, [
      profile.organization?.has_extra_usage_enabled ?? null,
    ]);

    // Invariante de tela: o dinheiro aparece em QUALQUER estado.
    const mostraDinheiro = view.subtitle.includes(view.used) && view.subtitle.includes(view.cap);
    checks.push(
      `${mostraDinheiro ? "ok  " : "FALHA"} ${"creditos — dinheiro visivel na tela".padEnd(38)} «${view.subtitle}»`,
    );
    if (!mostraDinheiro) {
      failures.push("creditos: a linha da tela escondeu o valor gasto ou o teto — foi exatamente o defeito anterior");
    }
    if (s.configuredOn === true && !s.spendableNow && /desativad|desligad/i.test(view.status)) {
      failures.push(
        `creditos: a conta esta com creditos LIGADOS no perfil, mas a tela diz «${view.status}» — contradiz o claude.ai`,
      );
    }
  }

  console.log(checks.join("\n"));
  console.log("");
  if (failures.length === 0) {
    console.log(`SINCRONIZADO — ${checks.length} conferencias, nenhuma divergencia com a API.`);
    process.exit(0);
  }
  console.log(`DESSINCRONIZADO — ${failures.length} divergencia(s):`);
  for (const f of failures) console.log(`  · ${f}`);
  process.exit(1);
})().catch((e) => {
  console.error("verificacao nao pode rodar:", e instanceof Error ? e.message : e);
  process.exit(2);
});
