import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { basename } from "node:path";
import { useState } from "react";
import { ExportPngAction } from "./export-png";
import { compact } from "./charts";
import { count, money, Report, share, costLabel, costSortValue } from "./report-data";

type Kind = "models" | "costs" | "efforts" | "projects";
const titles: Record<Kind, string> = {
  models: "Models",
  costs: "Estimated API Costs",
  efforts: "Reasoning Efforts",
  projects: "Projects",
};
type Row = { name: string; value: string; detail: string; fields: [string, string][] };

function rowsFor(kind: Kind, report: Report, sortBy: string): Row[] {
  if (kind === "projects") {
    return [...report.repositories]
      .sort((a, b) => (sortBy === "cost" ? costSortValue(b.cost) - costSortValue(a.cost) : b.sessions - a.sessions))
      .map((project) => ({
        name: basename(project.name) || project.name,
        value: sortBy === "cost" ? costLabel(project.cost) : `${count(project.sessions)} sessions`,
        detail: project.name,
        fields: [
          ["Repository / Directory", project.name],
          ["Sessions", count(project.sessions)],
          ["Estimated API Cost", costLabel(project.cost)],
        ],
      }));
  }
  if (kind === "models") {
    const byTurns = sortBy === "turns";
    const total = report.models.reduce((sum, model) => sum + (byTurns ? model.turns : model.tokens), 0);
    return [...report.models]
      .sort((a, b) =>
        sortBy === "cost"
          ? costSortValue(b.cost) - costSortValue(a.cost)
          : byTurns
            ? b.turns - a.turns
            : b.tokens - a.tokens,
      )
      .map((model) => ({
        name: model.name,
        value:
          sortBy === "cost"
            ? costLabel(model.cost)
            : `${compact(byTurns ? model.turns : model.tokens)} ${byTurns ? "turns" : "tokens"}`,
        detail: share(byTurns ? model.turns : model.tokens, total),
        fields: [
          ["Tokens", count(model.tokens)],
          ["Turns", count(model.turns)],
          [byTurns ? "Turn Share" : "Token Share", share(byTurns ? model.turns : model.tokens, total)],
          ["Estimated API Cost", costLabel(model.cost)],
        ],
      }));
  }
  if (kind === "costs") {
    return [
      ...report.costEstimate.modelCosts.map((model): Row => ({
        name: model.model,
        value: money(model.cost),
        detail: share(model.cost, report.costEstimate.totalCost),
        fields: [
          ["Estimated API Cost", money(model.cost)],
          ["Share of Priced Cost", share(model.cost, report.costEstimate.totalCost)],
          ["Input Tokens", count(model.tokens.input_tokens)],
          ["Cached Input Tokens", count(model.tokens.cached_input_tokens)],
          ["Output Tokens", count(model.tokens.output_tokens)],
        ],
      })),
      ...report.costEstimate.unpricedModels.map((model): Row => ({
        name: model.model,
        value: "Unpriced",
        detail: `${compact(model.tokens.total_tokens)} tokens`,
        fields: [
          ["Pricing", "No known price"],
          ["Tokens", count(model.tokens.total_tokens)],
          ["Included in Estimate", "No"],
        ],
      })),
    ];
  }
  const total = report.reasoningEfforts.reduce((sum, effort) => sum + effort.turns, 0);
  return report.reasoningEfforts.map((effort) => ({
    name: effort.name,
    value: `${count(effort.turns)} turns`,
    detail: share(effort.turns, total),
    fields: [
      ["Turns", count(effort.turns)],
      ["Share of Known Efforts", share(effort.turns, total)],
      ["Known Effort Turns", count(total)],
      [
        "Fast Mode",
        report.insights.fastModePercent == null
          ? "Unavailable"
          : `${report.insights.fastModePercent}% of known service tiers`,
      ],
    ],
  }));
}

export function Breakdown({ kind, report, period }: { kind: Kind; report: Report; period: string }) {
  const [sortBy, setSortBy] = useState(kind === "projects" ? "sessions" : "tokens");
  const [search, setSearch] = useState("");
  const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
  const rows = rowsFor(kind, report, sortBy).filter((row) =>
    terms.every((term) => `${row.name} ${row.detail}`.toLowerCase().includes(term)),
  );
  const note =
    kind !== "efforts"
      ? "API estimate, not subscription charges. Unpriced models are excluded."
      : "Distribution of recorded reasoning settings. Missing settings are excluded.";
  return (
    <List
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearch}
      navigationTitle={`${titles[kind]} · ${period}`}
      searchBarPlaceholder={`Filter ${kind === "efforts" ? "reasoning efforts" : kind === "projects" ? "projects" : "models"}…`}
      searchBarAccessory={
        kind === "models" || kind === "projects" ? (
          <List.Dropdown tooltip="Sort By" value={sortBy} onChange={setSortBy}>
            {kind === "models" ? (
              <List.Dropdown.Section>
                <List.Dropdown.Item title="By Tokens" value="tokens" />
                <List.Dropdown.Item title="By Turns" value="turns" />
              </List.Dropdown.Section>
            ) : (
              <List.Dropdown.Item title="By Sessions" value="sessions" />
            )}
            <List.Dropdown.Item title="By Cost" value="cost" />
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        title={search ? "No Matches" : "No Data for This Period"}
        description={search ? "Try a different filter." : "Go back and choose another period."}
        icon={search ? Icon.MagnifyingGlass : Icon.BarChart}
      />
      <List.Section
        title={period}
        subtitle={
          kind === "costs"
            ? `${money(report.costEstimate.totalCost)}${report.costEstimate.unpricedModels.length ? " · partial estimate" : " estimated"}`
            : `${rows.length} ${kind}`
        }
      >
        {rows.map((row) => (
          <List.Item
            key={`${row.name}-${row.detail}`}
            title={row.name}
            icon={
              kind === "costs"
                ? Icon.Coins
                : kind === "efforts"
                  ? Icon.LightBulb
                  : kind === "projects"
                    ? Icon.Folder
                    : Icon.Layers
            }
            accessories={[{ text: row.value, tooltip: row.detail }]}
            detail={
              <List.Item.Detail
                markdown={[
                  `## ${row.name}`,
                  note,
                  kind === "costs" ? (report.costAssumptions ?? []).join("\n\n") : "",
                ].join("\n\n")}
                metadata={
                  <List.Item.Detail.Metadata>
                    {row.fields.map(([title, value]) => (
                      <List.Item.Detail.Metadata.Label key={title} title={title} text={value} />
                    ))}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <ExportPngAction
                  card={{
                    title: titles[kind],
                    subtitle: `${period} · ${report.period.from ?? "All time"} — ${report.period.to}`,
                    generatedAt: report.generatedAt,
                    stats:
                      kind === "costs"
                        ? [{ label: "Estimated API Cost · All Models", value: money(report.costEstimate.totalCost) }]
                        : [],
                    rows: rows.map((entry) => ({
                      name: kind === "projects" ? entry.detail : entry.name,
                      value: entry.value,
                    })),
                    note: `${note}${search ? ` Filter: ${search}` : ""}`,
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Summary"
                  content={`${row.name} · ${period}\n${row.fields.map(([title, value]) => `${title}: ${value}`).join("\n")}\n${note}`}
                />
                <Action.CopyToClipboard title="Copy Name" content={row.name} shortcut={Keyboard.Shortcut.Common.Copy} />
                <Action.CopyToClipboard title="Copy Value" content={row.value} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
