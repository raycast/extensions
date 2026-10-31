import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import path from "node:path";
import { ageOf, bar, dayLabel, exact, money, tokens, untilReset } from "./lib/format";
import { PlanLimits, readPlanLimits, reasonLabel, sourceLabel, spendSummary } from "./lib/limits";
import { claudeHome } from "./lib/paths";
import { modelLabel } from "./lib/pricing";
import { Entry, Totals, addEntry, emptyTotals, groupBy, scanUsage, totalTokens } from "./lib/scan";
import { writeSummary } from "./lib/summary";

type Period = "today" | "7d" | "30d" | "all";

const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoje",
  "7d": "Ultimos 7 dias",
  "30d": "Ultimos 30 dias",
  all: "Todo o historico",
};

function daysAgoISO(n: number): string {
  const d = new Date(Date.now() - n * 86_400_000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function severityColor(percent: number, severity: string): Color {
  if (severity === "critical" || percent >= 90) return Color.Red;
  if (severity === "warning" || percent >= 75) return Color.Orange;
  if (percent >= 50) return Color.Yellow;
  return Color.Green;
}

function totalsMarkdown(title: string, t: Totals): string {
  return [
    `# ${title}`,
    "",
    `**${tokens(totalTokens(t))} tokens** · ${money(t.cost)} · ${exact(t.messages)} respostas`,
    "",
    "| Categoria | Tokens | Custo equivalente |",
    "| --- | ---: | ---: |",
    `| Entrada | ${exact(t.input)} | — |`,
    `| Saida | ${exact(t.output)} | — |`,
    `| Cache escrito (5 min) | ${exact(t.cacheWrite5m)} | — |`,
    `| Cache escrito (1 hora) | ${exact(t.cacheWrite1h)} | — |`,
    `| Cache lido | ${exact(t.cacheRead)} | — |`,
    `| **Total** | **${exact(totalTokens(t))}** | **${money(t.cost)}** |`,
    "",
    "> O custo e o valor equivalente nos precos de lista da API. Em plano de",
    "> assinatura ele nao e cobrado: serve para dimensionar o consumo.",
  ].join("\n");
}

export default function Command() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [projectOf, setProjectOf] = useState<Map<string, string>>(new Map());
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [period, setPeriod] = useState<Period>("7d");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setEntries(null);
      // Recarregar (Cmd+R) ignora o memo de 1 minuto e vai direto na API.
      const planLimits = await readPlanLimits({ force: reloadKey > 0 });
      if (!cancelled) setLimits(planLimits);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Lendo transcripts do Claude Code",
      });

      try {
        const result = await scanUsage((done, total) => {
          toast.message = `${done} de ${total} arquivos`;
        });
        if (cancelled) return;

        setEntries(result.entries);
        setProjectOf(result.projectOf);

        const today = daysAgoISO(0);
        const weekStart = daysAgoISO(6);
        const sum = (filter: (e: Entry) => boolean) => {
          const t = emptyTotals();
          for (const e of result.entries) if (filter(e)) addEntry(t, e);
          return { tokens: totalTokens(t), cost: t.cost };
        };
        await writeSummary({
          updatedAt: Date.now(),
          today: sum((e) => e.day === today),
          week: sum((e) => e.day >= weekStart),
          all: sum(() => true),
        });

        toast.style = Toast.Style.Success;
        toast.title = "Uso atualizado";
        toast.message =
          result.filesReparsed > 0
            ? `${result.filesReparsed} de ${result.filesScanned} arquivos relidos`
            : `${result.filesScanned} arquivos, tudo em cache`;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Falha ao ler os transcripts";
        toast.message = error instanceof Error ? error.message : String(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    if (period === "all") return entries;
    const from = period === "today" ? daysAgoISO(0) : period === "7d" ? daysAgoISO(6) : daysAgoISO(29);
    return entries.filter((e) => e.day >= from);
  }, [entries, period]);

  const overall = useMemo(() => {
    const t = emptyTotals();
    for (const e of filtered) addEntry(t, e);
    return t;
  }, [filtered]);

  const byDay = useMemo(
    () => [...groupBy(filtered, (e) => e.day).entries()].sort((a, b) => b[0].localeCompare(a[0])),
    [filtered],
  );
  const byProject = useMemo(
    () =>
      [...groupBy(filtered, (e) => projectOf.get(e.key) ?? "sem projeto").entries()].sort(
        (a, b) => b[1].cost - a[1].cost,
      ),
    [filtered, projectOf],
  );
  const byModel = useMemo(
    () => [...groupBy(filtered, (e) => e.model).entries()].sort((a, b) => b[1].cost - a[1].cost),
    [filtered],
  );

  const actions = (
    <ActionPanel>
      <Action
        title="Recarregar"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => setReloadKey((k) => k + 1)}
      />
      <Action.CopyToClipboard
        title="Copiar Resumo"
        content={`${PERIOD_LABEL[period]}: ${tokens(totalTokens(overall))} tokens, ${money(overall.cost)}`}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action.ShowInFinder
        title="Abrir Pasta Do Claude Code"
        path={path.join(claudeHome(), ".claude")}
        shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
      />
    </ActionPanel>
  );

  return (
    <List
      isLoading={entries === null}
      isShowingDetail
      searchBarPlaceholder="Filtrar por dia, projeto ou modelo"
      searchBarAccessory={
        <List.Dropdown tooltip="Periodo" value={period} onChange={(v) => setPeriod(v as Period)}>
          {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
            <List.Dropdown.Item key={p} title={PERIOD_LABEL[p]} value={p} />
          ))}
        </List.Dropdown>
      }
    >
      {/* A secao aparece sempre que houver algo a dizer — inclusive quando o que
          ha a dizer e que a leitura falhou. Antes ela era escondida quando nao
          havia janelas, e a falha sumia da tela junto. */}
      {limits && (limits.windows.length > 0 || limits.spend || limits.problem) && (
        <List.Section title="Limites do plano" subtitle={`${sourceLabel(limits)} · ${ageOf(limits.fetchedAt)}`}>
          {limits.problem && (
            <List.Item
              icon={{ source: Icon.Warning, tintColor: limits.source === "none" ? Color.Red : Color.Orange }}
              title={limits.source === "none" ? "Sem numero nenhum para mostrar" : "Mostrando dado antigo"}
              subtitle={limits.problem}
              accessories={[{ text: ageOf(limits.fetchedAt) }]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Leitura ao vivo falhou",
                    "",
                    limits.problem,
                    "",
                    limits.source === "none"
                      ? "Nao ha nem cache local para recuar. Nada nesta secao veio da API."
                      : [
                          `Os percentuais abaixo vem do cache do Claude Code, gravado **${ageOf(limits.fetchedAt)}**,`,
                          "e podem estar bem abaixo do consumo real. O liga/desliga dos creditos",
                          "nao aparece aqui: ele so existe no perfil ao vivo.",
                        ].join("\n"),
                    "",
                    "Abra o Claude Code uma vez e recarregue aqui com `Cmd+R`.",
                  ].join("\n")}
                />
              }
              actions={actions}
            />
          )}
          {limits.windows.map((w) => (
            <List.Item
              key={`${w.kind}-${w.scopeLabel ?? ""}`}
              icon={{
                source: w.percent >= 90 ? Icon.ExclamationMark : Icon.CircleProgress,
                tintColor: severityColor(w.percent, w.severity),
              }}
              title={w.label}
              subtitle={untilReset(w.resetsAt)}
              accessories={[{ text: `${w.percent}%`, icon: undefined }]}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${w.label}`,
                    "",
                    `\`${bar(w.percent, 24)}\` **${w.percent}%**`,
                    "",
                    `${untilReset(w.resetsAt)}${w.resetsAt ? ` — ${w.resetsAt.toLocaleString("pt-BR")}` : ""}`,
                    "",
                    w.isActive ? "Esta e a janela que esta limitando agora." : "Janela inativa no momento.",
                    "",
                    "---",
                    "",
                    `Fonte: ${sourceLabel(limits)}, ${ageOf(limits.fetchedAt)}. Mesmo numero da secao de uso no claude.ai.`,
                  ].join("\n")}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Uso" text={`${w.percent}%`} />
                      <List.Item.Detail.Metadata.Label
                        title="Severidade"
                        text={w.severity}
                        icon={{ source: Icon.Dot, tintColor: severityColor(w.percent, w.severity) }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Reinicia"
                        text={w.resetsAt ? w.resetsAt.toLocaleString("pt-BR") : "—"}
                      />
                      {limits.account?.orgType && (
                        <List.Item.Detail.Metadata.Label title="Plano" text={limits.account.orgType} />
                      )}
                      {limits.account?.email && (
                        <List.Item.Detail.Metadata.Label title="Conta" text={limits.account.email} />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={actions}
            />
          ))}
          {/* O valor gasto e o teto sao mostrados SEMPRE, em qualquer estado.
              Foi condiciona-los a um flag que fez a extensao divergir do site. */}
          {limits.spend &&
            (() => {
              const s = limits.spend;
              const view = spendSummary(s);
              const { used, cap } = view;
              const tint =
                view.tone === "on" ? Color.Green : view.tone === "blocked" ? Color.Orange : Color.SecondaryText;
              return (
                <List.Item
                  icon={{ source: Icon.Coins, tintColor: tint }}
                  title="Creditos extras"
                  subtitle={view.subtitle}
                  accessories={[{ text: `${s.percent}%` }]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        "# Creditos extras",
                        "",
                        `\`${bar(s.percent, 24)}\` **${s.percent}%** — ${used} de ${cap}`,
                        "",
                        view.tone === "on"
                          ? "Estao ligados e com saldo: quando os limites do plano acabam, o trabalho continua consumindo credito."
                          : view.tone === "blocked"
                            ? `Estao ligados na conta, mas nao ha como gastar agora (${reasonLabel(s.disabledReason) ?? "motivo nao informado"}). Ao bater o limite do plano, o Claude Code para ate a janela reiniciar.`
                            : "Estao desligados. Ao bater o limite do plano, o Claude Code para ate a janela reiniciar.",
                        "",
                        "| | |",
                        "| --- | ---: |",
                        `| Gasto no mes | **${used}** |`,
                        `| Teto mensal | ${cap} |`,
                        `| Ligados na conta | ${s.configuredOn === null ? "nao lido (perfil indisponivel)" : s.configuredOn ? "sim" : "nao"} |`,
                        `| Da para gastar agora | ${s.spendableNow ? "sim" : `nao — ${reasonLabel(s.disabledReason) ?? "motivo nao informado"}`} |`,
                        `| Comprar credito | ${s.canPurchase ? "disponivel" : "indisponivel nesta conta"} |`,
                        "",
                        "> `Ligados na conta` e o mesmo interruptor do claude.ai.",
                        "> `Da para gastar agora` e o estado do instante — pode estar",
                        "> ligado e travado por falta de saldo ao mesmo tempo.",
                        "",
                        "> Este e o unico numero que vira cobranca de verdade. O custo",
                        "> equivalente das outras secoes e so referencia de preco de API.",
                      ].join("\n")}
                    />
                  }
                  actions={actions}
                />
              );
            })()}
        </List.Section>
      )}

      <List.Section title={PERIOD_LABEL[period]}>
        <List.Item
          icon={{ source: Icon.BarChart, tintColor: Color.PrimaryText }}
          title="Total do periodo"
          subtitle={`${exact(overall.messages)} respostas`}
          accessories={[{ text: tokens(totalTokens(overall)) }, { tag: money(overall.cost) }]}
          detail={<List.Item.Detail markdown={totalsMarkdown(PERIOD_LABEL[period], overall)} />}
          actions={actions}
        />
      </List.Section>

      {byDay.length > 0 && (
        <List.Section title="Por dia" subtitle={`${byDay.length} dias`}>
          {byDay.map(([day, t]) => (
            <List.Item
              key={day}
              icon={Icon.Calendar}
              title={dayLabel(day)}
              subtitle={day}
              accessories={[{ text: tokens(totalTokens(t)) }, { tag: money(t.cost) }]}
              detail={<List.Item.Detail markdown={totalsMarkdown(dayLabel(day), t)} />}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      {byProject.length > 0 && (
        <List.Section title="Por projeto" subtitle={`${byProject.length} projetos`}>
          {byProject.map(([project, t]) => (
            <List.Item
              key={project}
              icon={Icon.Folder}
              title={project}
              accessories={[{ text: tokens(totalTokens(t)) }, { tag: money(t.cost) }]}
              detail={<List.Item.Detail markdown={totalsMarkdown(project, t)} />}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      {byModel.length > 0 && (
        <List.Section title="Por modelo" subtitle={`${byModel.length} modelos`}>
          {byModel.map(([model, t]) => (
            <List.Item
              key={model}
              icon={Icon.Stars}
              title={modelLabel(model)}
              subtitle={model}
              accessories={[{ text: tokens(totalTokens(t)) }, { tag: money(t.cost) }]}
              detail={<List.Item.Detail markdown={totalsMarkdown(modelLabel(model), t)} />}
              actions={actions}
            />
          ))}
        </List.Section>
      )}

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={entries === null ? "Lendo transcripts" : "Nenhum uso no periodo"}
        description={
          entries === null
            ? "A primeira leitura percorre todo o historico; as seguintes usam cache."
            : "Troque o periodo no seletor a direita da busca."
        }
      />
    </List>
  );
}
