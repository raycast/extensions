// A crawl, and what to change when it finishes.
//
// Capped by preference — a launcher is a poor place to wait out a thousand
// pages, and the honest answer for a big site is the app or the terminal, which
// the empty state says rather than leaving somebody watching a spinner.
//
// The findings are grouped by `causePayload()` in the engine, so the order here
// is the order the terminal prints and the macOS window draws: worst first,
// then by how much of the site points at it.

import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  LaunchProps,
  getPreferenceValues,
} from "@raycast/api";

import {
  audit,
  causePayload,
  type CrawlOptions,
  type Report,
  type Score,
} from "../lib/engine";
import {
  causeRows,
  crawlOptions,
  gainFor,
  normalise,
  hostRows,
  optionsForFlag,
  passedRows,
  scoreLine,
  scoreTag,
  skippedRows,
  summaryLine,
} from "../lib/present.mjs";
import { ExportActions } from "./exports";

const TONE: Record<string, { icon: Icon; tint: Color }> = {
  error: { icon: Icon.XMarkCircle, tint: Color.Red },
  warn: { icon: Icon.ExclamationMark, tint: Color.Orange },
  info: { icon: Icon.Info, tint: Color.Blue },
};

/** Green, amber or red. The thresholds are `gradeOf()`'s, so a dial in the
 *  window and a tint here change colour at the same number. */
const scoreTint = (value: number | undefined) =>
  value === undefined
    ? Color.SecondaryText
    : value >= 80
      ? Color.Green
      : value >= 60
        ? Color.Orange
        : Color.Red;

/** Pages affected, and — where the score counts the check — what fixing it is
 *  worth. The points come first: it is the number that says what to do next. */
function gainAccessories(
  row: { pages: string[]; checkId: string },
  score: Score | undefined,
): List.Item.Accessory[] {
  const gain = gainFor(row, score);
  return [
    ...(gain
      ? [
          {
            tag: { value: `+${gain.toFixed(1)}`, color: Color.Green },
            tooltip: "What the score gains when this is clean",
          },
        ]
      : []),
    { text: String(row.pages.length), icon: Icon.Document },
  ];
}

export default function Command(
  // `Arguments.Audit` is generated from the manifest, so the shape of what
  // arrives here cannot disagree with what the command declares it takes.
  props: LaunchProps<{ arguments: Arguments.Audit }>,
) {
  return <Report site={normalise(props.arguments.site) ?? ""} />;
}

export function Report({ site }: { site: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [progress, setProgress] = useState("Starting…");
  // A crawl is minutes and a launcher is not built for minutes. A path on its
  // own — "Reading /docs/plugins/" — is motion without a horizon: it could be
  // the second page or the last. A count against the ceiling makes the wait
  // bounded, which is the difference between slow and stuck.
  const [done, setDone] = useState(0);
  const [working, setWorking] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  // Options the person asked for *after* seeing the report, by pressing one of
  // the "Not checked" rows. Kept apart from the preferences so a re-run is
  // plainly this run plus one thing, and so the preference itself is not
  // quietly rewritten by a one-off.
  const [added, setAdded] = useState<Record<string, unknown>>({});
  const options = {
    ...crawlOptions(getPreferenceValues<Preferences>()),
    ...added,
  };

  useEffect(() => {
    if (!site) {
      setFailed("That is not a site. Try example.com.");
      setWorking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { findings, meta, sitemap, llms, schema, score } = await audit(
          site,
          {
            ...options,
            // Asked for during the run: rebuilding it needs the status, robots
            // directive and canonical of every page, none of which survives past
            // the crawl. It costs one already-cached request.
            writeSitemap: true,
            // Costs no requests at all: it is built from titles and descriptions
            // the crawl has already read.
            writeLlms: true,
            writeSchema: true,
            onProgress: (
              event: Parameters<NonNullable<CrawlOptions["onProgress"]>>[0],
            ) => {
              if (cancelled) return;
              // The same events the terminal prints, said shorter.
              if (event.phase === "crawl" && event.url) {
                setDone((n) => n + 1);
                setProgress(new URL(event.url).pathname);
              } else if (event.detail) {
                setProgress(event.detail);
              }
            },
          },
        );
        if (cancelled) return;
        setReport({
          meta,
          findings,
          causes: causePayload(findings, meta.pages),
          sitemap,
          llms,
          schema,
          score,
        });
      } catch (error) {
        if (!cancelled)
          setFailed(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setWorking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // `added` is in here on purpose: pressing a "Not checked" row is a request
    // to run again with that switched on, and the crawl is the only thing that
    // can answer it. A check that was skipped was never measured, so there is
    // nothing cached to reveal.
  }, [site, added]);

  const rows = causeRows(report);
  const areas = [...new Set(rows.map((row) => row.area))];
  const score = report?.score;

  return (
    <List isLoading={working} searchBarPlaceholder="Filter what to change">
      {working && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={
            done > 0 ? `${done} of at most ${options.limit} pages` : progress
          }
          description={
            done > 0
              ? `Reading ${progress} · a crawl takes minutes, which is why Preview exists. Nothing leaves this machine.`
              : "Every page in the sitemap, not just the home page. Nothing leaves this machine."
          }
        />
      )}

      {!working && failed && (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="The audit stopped"
          description={failed}
        />
      )}

      {!working && !failed && rows.length === 0 && (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="Nothing to change"
          description={summaryLine(report)}
        />
      )}

      {!working && !failed && scoreTag(score) && (
        <List.Section title="Score" subtitle={summaryLine(report)}>
          <List.Item
            icon={{ source: Icon.Gauge, tintColor: scoreTint(score?.score) }}
            title={scoreTag(score) ?? ""}
            subtitle={scoreLine(score)}
            actions={
              <ActionPanel>
                <ExportActions
                  report={report}
                  host={site ? new URL(site).host : ""}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {areas.map((area) => (
        <List.Section
          key={area}
          title={area}
          subtitle={
            area === areas[0] && !scoreTag(score)
              ? summaryLine(report)
              : undefined
          }
        >
          {rows
            .filter((row) => row.area === area)
            .map((row) => (
              <List.Item
                key={row.id}
                icon={{
                  source: TONE[row.tone]?.icon ?? Icon.Dot,
                  tintColor: TONE[row.tone]?.tint ?? Color.SecondaryText,
                }}
                title={row.title}
                subtitle={row.subtitle}
                accessories={gainAccessories(row, score)}
                actions={
                  <ActionPanel>
                    <ExportActions
                      report={report}
                      host={site ? new URL(site).host : ""}
                    />
                    {row.pages[0] && (
                      <Action.OpenInBrowser
                        title="Open First Page"
                        url={row.pages[0]}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Affected Pages"
                      content={row.pages.join("\n")}
                    />
                    <Action.CopyToClipboard
                      title="Copy Check Id"
                      content={row.checkId}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Whole Report as JSON"
                      content={JSON.stringify(report, null, 2)}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}

      {/* The rest of the domain, when the run was asked to look. Not findings
          and not filtered with them: most of these rows are a healthy domain
          going about its business, and the two or three that are findings take
          the colour of the finding above. */}
      {!working &&
        !failed &&
        hostRows(report?.meta, report?.findings).length > 0 && (
          <List.Section
            title={`Hosts on ${report?.meta?.hosts?.apex ?? ""}`}
            subtitle={`${report?.meta?.hosts?.found ?? 0} in certificate transparency, ${
              report?.meta?.hosts?.resolved ?? 0
            } resolving`}
          >
            {hostRows(report?.meta, report?.findings).map((row) => (
              <List.Item
                key={row.id}
                icon={{
                  source: row.tone === "plain" ? Icon.Dot : Icon.Warning,
                  tintColor:
                    row.tone === "error"
                      ? Color.Red
                      : row.tone === "warn"
                        ? Color.Orange
                        : Color.SecondaryText,
                }}
                title={row.title}
                subtitle={row.subtitle}
              />
            ))}
          </List.Section>
        )}

      {/* What passed, and what never came up. A missing finding reads exactly
          like a passing one, so both are named and the second says why. */}
      {!working && !failed && passedRows(score).length > 0 && (
        <List.Section
          title="Passing"
          subtitle={`${passedRows(score).length} checks`}
        >
          {passedRows(score).map((row) => (
            <List.Item
              key={row.id}
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              title={row.title}
              subtitle={row.subtitle}
            />
          ))}
        </List.Section>
      )}

      {!working && !failed && skippedRows(score).length > 0 && (
        <List.Section
          title="Not Checked"
          subtitle="Counted neither for nor against the score"
        >
          {skippedRows(score).map((row) => {
            // Two kinds of skip, and only one is anybody's to fix. "No page
            // declares hreflang" is a fact about the site. "Outbound links were
            // not checked" is a run that was not asked to, and asking is one
            // flag away — so that row becomes something you can press, and the
            // rest stay exactly as they were. The engine decides which is which,
            // because the engine is what skipped the check.
            const patch = row.enabledBy ? optionsForFlag(row.enabledBy) : null;
            const already = patch
              ? Object.keys(patch).every((key) => key in added)
              : false;
            return (
              <List.Item
                key={row.id}
                icon={{
                  source: patch ? Icon.Play : Icon.MinusCircle,
                  tintColor: patch ? Color.Blue : Color.SecondaryText,
                }}
                title={row.title}
                subtitle={row.subtitle}
                accessories={
                  patch && !already
                    ? [
                        {
                          tag: {
                            value: row.enabledBy ?? "",
                            color: Color.Blue,
                          },
                        },
                      ]
                    : undefined
                }
                actions={
                  patch && !already ? (
                    <ActionPanel>
                      <Action
                        title="Run Again with This Check"
                        icon={Icon.Play}
                        onAction={() =>
                          setAdded((was) => ({ ...was, ...patch }))
                        }
                      />
                    </ActionPanel>
                  ) : undefined
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
