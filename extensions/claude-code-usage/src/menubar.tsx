import { Color, Icon, MenuBarExtra, launchCommand, LaunchType, open } from "@raycast/api";
import { useEffect, useState } from "react";
import path from "node:path";
import { ageOf, money, tokens, untilReset } from "./lib/format";
import { PlanLimits, readPlanLimits, sourceLabel, spendSummary } from "./lib/limits";
import { claudeHome } from "./lib/paths";
import { UsageSummary, readSummary } from "./lib/summary";

/**
 * Comando de barra: roda a cada 10 minutos, entao le apenas o barato —
 * `.claude.json` para os limites e o resumo gravado pelo comando de janela.
 * Nunca varre os 174 MB de transcript aqui.
 */

function color(percent: number, severity: string): Color {
  if (severity === "critical" || percent >= 90) return Color.Red;
  if (severity === "warning" || percent >= 75) return Color.Orange;
  if (percent >= 50) return Color.Yellow;
  return Color.Green;
}

export default function Command() {
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [l, s] = await Promise.all([readPlanLimits(), readSummary()]);
      setLimits(l);
      setSummary(s);
      setLoading(false);
    })();
  }, []);

  const session = limits?.windows.find((w) => w.kind === "session");
  const weekly = limits?.windows.find((w) => w.kind === "weekly_all");

  const title =
    session || weekly ? `${session ? `${session.percent}%` : "—"} · ${weekly ? `${weekly.percent}%` : "—"}` : undefined;

  // A cor tem que refletir o limite que esta mais perto de estourar, inclusive
  // um semanal por modelo (`weekly_scoped`), que nao entra no titulo.
  const worst = Math.max(0, ...(limits?.windows ?? []).map((w) => w.percent));

  return (
    <MenuBarExtra
      isLoading={loading}
      icon={{ source: Icon.CircleProgress, tintColor: color(worst, "normal") }}
      title={title}
      tooltip="Claude Code — janela de 5h · limite semanal"
    >
      <MenuBarExtra.Section title="Limites do plano">
        {limits?.windows.map((w) => (
          <MenuBarExtra.Item
            key={`${w.kind}-${w.scopeLabel ?? ""}`}
            icon={{ source: Icon.Dot, tintColor: color(w.percent, w.severity) }}
            title={`${w.label} — ${w.percent}%`}
            subtitle={untilReset(w.resetsAt)}
            onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
          />
        ))}
        {limits?.spend &&
          (() => {
            const view = spendSummary(limits.spend);
            return (
              <MenuBarExtra.Item
                icon={{
                  source: Icon.Coins,
                  tintColor:
                    view.tone === "on" ? Color.Green : view.tone === "blocked" ? Color.Orange : Color.SecondaryText,
                }}
                // O valor gasto aparece em qualquer estado — e o numero do site.
                title={`Creditos extras — ${view.used} de ${view.cap}`}
                subtitle={`${limits.spend.percent}% · ${view.status}`}
                onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
              />
            );
          })()}
        {limits?.problem && (
          <MenuBarExtra.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title="Dado antigo"
            subtitle={limits.problem}
            onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
          />
        )}
        {(!limits || limits.windows.length === 0) && (
          <MenuBarExtra.Item
            title="Sem leitura de limites"
            subtitle="Faca login no Claude Code para liberar a leitura"
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Consumo (valor equivalente na API)">
        {summary ? (
          <>
            <MenuBarExtra.Item
              icon={Icon.Calendar}
              title={`Hoje — ${tokens(summary.today.tokens)}`}
              subtitle={money(summary.today.cost)}
              onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              icon={Icon.Clock}
              title={`7 dias — ${tokens(summary.week.tokens)}`}
              subtitle={money(summary.week.cost)}
              onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
            />
            <MenuBarExtra.Item
              icon={Icon.BarChart}
              title={`Total — ${tokens(summary.all.tokens)}`}
              subtitle={money(summary.all.cost)}
              onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
            />
          </>
        ) : (
          <MenuBarExtra.Item
            title="Consumo ainda nao calculado"
            subtitle="Abra o comando Uso do Claude Code uma vez"
            onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
          />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.AppWindowList}
          title="Abrir detalhamento"
          onAction={() => launchCommand({ name: "usage", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          icon={Icon.Folder}
          title="Abrir pasta do Claude Code"
          onAction={() => open(path.join(claudeHome(), ".claude"))}
        />
        <MenuBarExtra.Item
          icon={Icon.Info}
          title={`Limites: ${limits ? sourceLabel(limits) : "sem leitura"}, ${ageOf(limits?.fetchedAt ?? null)}`}
          subtitle={summary ? `consumo calculado ${ageOf(new Date(summary.updatedAt))}` : undefined}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
