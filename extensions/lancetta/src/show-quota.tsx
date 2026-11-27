import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  environment,
  getPreferenceValues,
  Icon,
  Image,
  Keyboard,
  List,
  showHUD,
} from "@raycast/api";
import { getProgressIcon, showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ERROR_IN_VIEW, LancettaMissingView, OpenLancettaAction, RefreshAction } from "./lib/actions";
import { chartMarkdownImage, chartSVG, svgImage } from "./lib/chart";
import { DIAL_SIZE, dialSVG } from "./lib/dial";
import { HistoryWindow, loadHistory, previousSeries, WindowKey, windowSeries } from "./lib/history";
import { lancettaShowsRemaining, statusLine, tintOf, TROUBLESHOOTING_URL } from "./lib/lancetta";
import { DetailNumberRow, NumberRow } from "./lib/metadata";
import {
  Advice,
  Agent,
  band,
  currentAdvice,
  formatDate,
  formatSpan,
  formatWhen,
  isMissing,
  isStale,
  loadSnapshot,
  nowSeconds,
  planName,
  Problem,
  runOutAdvice,
  Snapshot,
  SNAPSHOT_PATH,
  Window,
} from "./lib/snapshot";

const BAND_COLOR = { low: Color.Green, mid: Color.Yellow, high: Color.Red } as const;

const TONE: Record<string, { icon: Image.ImageLike; label: string }> = {
  warning: { icon: { source: Icon.ExclamationMark, tintColor: Color.Red }, label: "Warning" },
  caution: { icon: { source: Icon.Warning, tintColor: Color.Orange }, label: "Caution" },
  encourage: { icon: { source: Icon.CheckCircle, tintColor: Color.Green }, label: "Room to spend" },
  info: { icon: { source: Icon.Info, tintColor: Color.SecondaryText }, label: "Info" },
};

/** Each kind of window: how long it lasts, and what the rows and the side pane call it. */
const WINDOWS = {
  fiveHour: { span: 5 * 3600, title: "5 Hours", label: "5 hours" },
  sevenDay: { span: 7 * 86400, title: "7 Days", label: "7 days" },
  model: { span: 7 * 86400, title: "", label: "" },
} as const;

/** The side pane is open: rows keep only what fits beside it. */
const Compact = createContext(false);

/** What a window's side pane is drawn from: the agent's history and the advice still current. */
type Charts = { windows: HistoryWindow[]; advice: Advice[]; now: number; showLeft: boolean };

export default function Command() {
  const { display } = getPreferenceValues<Preferences.ShowQuota>();
  const { data, isLoading, error, revalidate } = usePromise(loadSnapshot, [], ERROR_IN_VIEW);
  const { data: lancettaLeft } = usePromise(lancettaShowsRemaining, [], { execute: display === "lancetta" });
  const showLeft = display === "left" || (display === "lancetta" && lancettaLeft === true);
  // the side pane stays the way it was left, from one opening of the command to the next
  const [showingCharts, setShowingCharts] = useCachedState("showing-charts", false);
  // rerun with each new snapshot: the series is the app's, as fresh as its last poll
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: histories } = usePromise((_snapshot?: Snapshot) => loadHistory(), [data], {
    execute: !!data && showingCharts,
  });
  // one clock per load: the rows and the charts agree, and the charts are not redrawn on every render
  const now = useMemo(nowSeconds, [data, histories]);
  const advice = useMemo(() => (data ? currentAdvice(data, now) : []), [data, now]);
  const charts = useMemo(
    () =>
      showingCharts
        ? Object.fromEntries(
            (data?.agents ?? []).map((a) => [a.agent, { windows: histories?.[a.agent] ?? [], advice, now, showLeft }]),
          )
        : null,
    [showingCharts, data, histories, advice, now, showLeft],
  );

  const common = (
    <>
      <OpenLancettaAction />
      <RefreshAction onRefresh={revalidate} />
      <Action
        title="Copy Status Line"
        icon={Icon.Terminal}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onAction={async () => {
          try {
            await Clipboard.copy(await statusLine());
            await showHUD("Copied Lancetta's status line");
          } catch (e) {
            await showFailureToast(e, { title: "No status line" });
          }
        }}
      />
      {data && <Action.CopyToClipboard title="Copy Usage JSON" content={JSON.stringify(data, null, 2)} />}
    </>
  );

  if (error) {
    return (
      <List>
        {isMissing(error) ? (
          <LancettaMissingView onRefresh={revalidate} />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Could Not Read Lancetta's Usage"
            description={error.message}
            actions={
              <ActionPanel>
                {common}
                <Action.ShowInFinder title="Show Usage File" path={SNAPSHOT_PATH} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  const toggle = (
    <Action
      title={showingCharts ? "Hide Chart" : "Show Chart"}
      icon={Icon.LineChart}
      onAction={() => setShowingCharts((shown) => !shown)}
    />
  );

  return (
    <Compact.Provider value={showingCharts}>
      <List isLoading={isLoading} isShowingDetail={showingCharts} searchBarPlaceholder="Filter agents and suggestions">
        {data && isStale(data.writtenAt, now) && (
          <List.Section title="Lancetta">
            <List.Item
              icon={{ source: Icon.Clock, tintColor: Color.Orange }}
              title="Not Running"
              subtitle={
                showingCharts
                  ? undefined
                  : `Last wrote ${formatSpan(now - data.writtenAt)} ago: these numbers are that old`
              }
              detail={
                <List.Item.Detail
                  markdown={`## Lancetta Is Not Running\n\nIt last wrote ${formatSpan(now - data.writtenAt)} ago, so every number here is that old. Launch the app to read them again.`}
                />
              }
              actions={<ActionPanel>{common}</ActionPanel>}
            />
          </List.Section>
        )}
        {advice.length > 0 && (
          <List.Section title="Suggestions">
            {advice.map((item) => (
              <AdviceItem key={`${item.kind}.${item.agent ?? "mac"}`} item={item} now={now} actions={common} />
            ))}
          </List.Section>
        )}
        {data?.agents.map((agent) => (
          <AgentSection
            key={agent.agent}
            agent={agent}
            now={now}
            showLeft={showLeft}
            actions={common}
            toggle={toggle}
            charts={charts?.[agent.agent] ?? null}
          />
        ))}
        {data && data.agents.length === 0 && (
          <List.EmptyView
            icon={Icon.Gauge}
            title="No Agents Watched"
            description="Lancetta is not watching Claude or Codex: choose them in its Settings."
            actions={<ActionPanel>{common}</ActionPanel>}
          />
        )}
      </List>
    </Compact.Provider>
  );
}

function AgentSection(props: {
  agent: Agent;
  now: number;
  showLeft: boolean;
  actions: ReactNode;
  toggle: ReactNode;
  charts: Charts | null;
}) {
  const { agent, now, showLeft, actions, toggle, charts } = props;
  const compact = useContext(Compact);
  const reading = agent.reading;
  const windowPanel = (
    <ActionPanel>
      {toggle}
      {actions}
    </ActionPanel>
  );

  // the rows' windows, and their side panes worked out once per load rather than on every render
  const windows = useMemo(() => {
    if (!reading) return [];
    const rows: { key: WindowKey; title: string; label: string; window: Window; subtitle?: string }[] = [
      { key: { kind: "fiveHour" }, ...WINDOWS.fiveHour, window: reading.fiveHour },
      { key: { kind: "sevenDay" }, ...WINDOWS.sevenDay, window: reading.sevenDay },
      ...reading.models.map((model) => ({
        key: { kind: "model" as const, id: model.id },
        title: model.label,
        label: `${model.label}'s week`,
        window: { usedPercent: model.usedPercent, resetsAt: model.resetsAt },
        subtitle: model.group === "weekly" ? "its own week" : model.group,
      })),
    ];
    return rows.map((row) => ({
      ...row,
      detail: charts ? windowDetail(agent, row.key, row.window, row.label, charts) : undefined,
    }));
  }, [agent, reading, charts]);

  if (!reading) {
    return (
      <List.Section title={agent.agent}>
        {agent.problem ? (
          <ProblemItem problem={agent.problem} agent={agent.agent} actions={actions} />
        ) : (
          <List.Item
            icon={Icon.Hourglass}
            title="Waiting for the First Reading"
            keywords={[agent.agent]}
            detail={
              <List.Item.Detail
                markdown={`Lancetta has not read ${agent.agent}'s quota yet: it shows here after its next poll.`}
              />
            }
            actions={<ActionPanel>{actions}</ActionPanel>}
          />
        )}
      </List.Section>
    );
  }

  const age = now - reading.observedAt;
  const subtitle = [planName(reading.plan), `read ${age < 60 ? "just now" : `${formatSpan(age)} ago`}`]
    .filter(Boolean)
    .join(" · ");
  const credits = reading.resetCreditsAvailable ?? 0;
  const refusal = reading.blockedBucket
    ? `The ${reading.blockedBucket} limit said no`
    : "Ordinary usage is not allowed now";

  return (
    <List.Section title={agent.agent} subtitle={subtitle}>
      {reading.blocked && (
        <List.Item
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title={compact ? "Refused" : "Refused by the Account"}
          keywords={[agent.agent]}
          subtitle={compact ? undefined : refusal}
          detail={
            <List.Item.Detail
              markdown={`## Refused by the Account\n\n${refusal}, whatever the percentages say.${credits ? ` A free reset is available: Lancetta can spend it.` : ""}`}
            />
          }
          accessories={
            credits ? [{ tag: { value: `${credits} free reset${credits > 1 ? "s" : ""}`, color: Color.Green } }] : []
          }
          actions={
            <ActionPanel>
              {credits > 0 && (
                // spending a reset credit is the app's: it holds the Codex connection
                <OpenLancettaAction title="Use Free Reset in Lancetta" icon={Icon.RotateClockwise} />
              )}
              {actions}
            </ActionPanel>
          }
        />
      )}
      {windows.map((row) => (
        <WindowItem
          key={row.key.kind === "model" ? row.key.id : row.key.kind}
          title={row.title}
          subtitle={row.subtitle}
          keywords={[agent.agent]}
          window={row.window}
          now={now}
          showLeft={showLeft}
          actions={windowPanel}
          detail={row.detail}
        />
      ))}
      {agent.problem && <ProblemItem problem={agent.problem} agent={agent.agent} actions={actions} />}
    </List.Section>
  );
}

/**
 * One window's side pane: the 5-hour window as Lancetta's clock, a week as its chart, and the
 * numbers below. The projection is the app's own: the time its advice says the pace runs out,
 * kept only when it falls between now and the reset, never one worked out here.
 */
function windowDetail(agent: Agent, key: WindowKey, window: Window, label: string, charts: Charts) {
  if (window.absent) return undefined;
  if (!window.resetsAt) {
    return (
      <List.Item.Detail
        markdown={`**${label.charAt(0).toUpperCase() + label.slice(1)}**: no reset time yet, so there is no window to draw. It starts with the next request.`}
      />
    );
  }
  const { now, showLeft } = charts;
  const span = WINDOWS[key.kind].span;
  const opensAt = window.resetsAt - span;
  const tint = tintOf(agent.agent);
  const dark = environment.appearance === "dark";
  const stop = key.kind === "model" ? undefined : runOutAdvice(charts.advice, agent.agent, key.kind);
  const stopAt = stop?.at && stop.at > now && stop.at < window.resetsAt ? stop.at : null;
  // the clock draws no readings, so only a week reads the history
  // with Lancetta closed past the reset the snapshot still holds the old window: draw it up to its end
  const drawnTo = Math.min(now, window.resetsAt);
  const points = key.kind === "fiveHour" ? [] : windowSeries(charts.windows, key, opensAt, drawnTo);
  // the pace's reasoning (`basis`) stays in its suggestion: a label cuts it, and under the image
  // it falls behind the metadata
  const markdown =
    key.kind === "fiveHour"
      ? svgImage(
          dialSVG({ opensAt, resetsAt: window.resetsAt, now: drawnTo, stopAt, tint, dark }),
          190,
          DIAL_SIZE,
          DIAL_SIZE,
        )
      : chartMarkdownImage(
          chartSVG({
            opensAt,
            resetsAt: window.resetsAt,
            now: drawnTo,
            points,
            lastWeek: previousSeries(charts.windows, key),
            stopAt,
            tint,
            dark,
          }),
        );
  const used = window.usedPercent;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title={label.charAt(0).toUpperCase() + label.slice(1)}
            text={`${formatWhen(opensAt)} → ${formatWhen(window.resetsAt)}`}
          />
          <List.Item.Detail.Metadata.Label
            title={showLeft ? "Left" : "Used"}
            text={used === null ? "unknown" : `${Math.round(showLeft ? 100 - used : used)}%`}
          />
          <List.Item.Detail.Metadata.Label
            title="Resets"
            text={window.resetsAt > now ? `in ${formatSpan(window.resetsAt - now)}` : "due now"}
          />
          {stopAt && (
            <List.Item.Detail.Metadata.Label
              title="At This Pace, Runs Out"
              text={`${formatWhen(stopAt)} · in ${formatSpan(stopAt - now)}`}
              icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            />
          )}
          {key.kind !== "fiveHour" && <NumberRow title="Readings" value={String(points.length)} />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function WindowItem(props: {
  title: string;
  subtitle?: string;
  keywords: string[];
  window: Window;
  now: number;
  showLeft: boolean;
  actions: ReactNode;
  detail?: ReactNode;
}) {
  const { title, keywords, window, now, showLeft, actions, detail } = props;
  const compact = useContext(Compact);
  const subtitle = compact ? undefined : props.subtitle;

  if (window.absent) {
    return (
      <List.Item
        keywords={keywords}
        icon={Icon.Minus}
        title={title}
        subtitle={compact ? undefined : "Not on this plan"}
        accessories={compact ? [{ text: "none" }] : []}
        actions={actions}
        detail={
          <List.Item.Detail markdown={`**${title}**: this plan has no such window, so there is nothing to wait for.`} />
        }
      />
    );
  }
  const used = window.usedPercent;
  const resets: List.Item.Accessory[] =
    window.resetsAt && !compact
      ? [
          {
            text: window.resetsAt > now ? `resets in ${formatSpan(window.resetsAt - now)}` : "reset due",
            tooltip: new Date(window.resetsAt * 1000).toLocaleString(),
          },
        ]
      : [];
  if (used === null) {
    return (
      <List.Item
        keywords={keywords}
        icon={Icon.QuestionMark}
        title={title}
        subtitle={subtitle}
        accessories={[{ text: "unknown" }, ...resets]}
        actions={actions}
        detail={detail}
      />
    );
  }
  const color = BAND_COLOR[band(used)];
  const shown = showLeft ? `${Math.round(100 - used)}% left` : `${Math.round(used)}% used`;
  return (
    <List.Item
      keywords={keywords}
      icon={getProgressIcon(Math.min(1, used / 100), color)}
      title={title}
      subtitle={subtitle}
      accessories={[{ tag: { value: shown, color } }, ...resets]}
      actions={actions}
      detail={detail}
    />
  );
}

function ProblemItem(props: { problem: Problem; agent: string; actions: ReactNode }) {
  const { problem, agent, actions } = props;
  const compact = useContext(Compact);
  const report = [`${problem.code} ${problem.title}`, problem.message, problem.detail].filter(Boolean).join("\n");
  return (
    <List.Item
      // a state clears by itself or waits on a click; a fault is drawn in red, as the app does
      icon={{ source: Icon.ExclamationMark, tintColor: problem.state ? Color.SecondaryText : Color.Red }}
      title={problem.title}
      keywords={[agent, problem.code]}
      subtitle={compact ? undefined : problem.message}
      accessories={[{ tag: problem.code }]}
      detail={
        <List.Item.Detail
          markdown={`## ${problem.code} · ${problem.title}\n\n${problem.message}\n\n${problem.detail ?? ""}`}
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Troubleshooting" url={TROUBLESHOOTING_URL} />
          <Action.CopyToClipboard title="Copy Problem" content={report} />
          {actions}
        </ActionPanel>
      }
    />
  );
}

function AdviceItem(props: { item: Advice; now: number; actions: ReactNode }) {
  const { item, now, actions } = props;
  const compact = useContext(Compact);
  const tone = TONE[item.tone] ?? TONE.info;
  const markdown = [`## ${item.title}`, ...item.steps.map((step) => `- ${step}`), "", `_${item.basis}_`].join("\n");
  const when = item.at && item.at > now ? `in ${formatSpan(item.at - now)}` : null;
  return (
    <List.Item
      icon={tone.icon}
      title={item.title}
      keywords={[item.kind, item.agent ?? "mac"]}
      accessories={compact ? [] : [...(item.agent ? [{ tag: item.agent }] : []), ...(when ? [{ text: when }] : [])]}
      detail={<List.Item.Detail markdown={markdown} />}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Suggestion"
            icon={Icon.Sidebar}
            target={
              <Detail
                markdown={markdown}
                navigationTitle={item.agent ?? "Lancetta"}
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label title="Tone" text={tone.label} icon={tone.icon} />
                    {item.agent && <Detail.Metadata.Label title="Agent" text={item.agent} />}
                    {item.at && <DetailNumberRow title="When" value={formatDate(item.at)} />}
                  </Detail.Metadata>
                }
                actions={<ActionPanel>{actions}</ActionPanel>}
              />
            }
          />
          <Action.CopyToClipboard
            title="Copy Suggestion"
            content={`${item.title}\n${item.steps.map((s) => `- ${s}`).join("\n")}`}
          />
          {actions}
        </ActionPanel>
      }
    />
  );
}
