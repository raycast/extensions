import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  LEADERBOARD_VIEWS,
  TourId,
  getLeaderboard,
  getSeasonLeaders,
  nextTour,
  totalColorTag,
  tourTitle,
} from "./espn";
import { PlayerDetailPane } from "./player-detail";

interface Row {
  id: string;
  athleteId?: string;
  name: string;
  lead: string; // position ("T5") or rank ("1")
  value: string;
  valueColor: Color;
  flag?: string;
  medalRank?: number;
  base: { label: string; value: string }[];
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const [tour, setTour] = useState<TourId>(prefs.defaultTour ?? "pga");
  const [view, setView] = useState<string>("tournament");
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isTournament = view === "tournament";

  const lb = useCachedPromise(getLeaderboard, [tour], {
    execute: isTournament,
    keepPreviousData: true,
  });
  const sl = useCachedPromise(getSeasonLeaders, [tour, view], {
    execute: !isTournament,
    keepPreviousData: true,
  });

  const isLoading = isTournament ? lb.isLoading : sl.isLoading;
  const error = isTournament ? lb.error : sl.error;
  const revalidate = isTournament ? lb.revalidate : sl.revalidate;

  // Auto-refresh while a tournament round is actually in progress (live results).
  useEffect(() => {
    if (!isTournament || !lb.data?.isLive) return;
    const t = setInterval(() => lb.revalidate(), 30_000);
    return () => clearInterval(t);
  }, [isTournament, lb.data?.isLive, lb.revalidate]);

  let rows: Row[] = [];
  let sectionTitle = "";

  if (isTournament) {
    const board = lb.data;
    sectionTitle = board?.isMostRecent
      ? `Final · ${board.eventName}`
      : (board?.statusDetail ??
        (board?.state === "in"
          ? "Live"
          : board?.state === "post"
            ? "Final"
            : "Scheduled"));
    if (board?.isMajor)
      sectionTitle = `⛳ ${board.majorLabel} · ${sectionTitle}`;
    rows = (board?.players ?? []).map((p, i) => {
      const base = [
        { label: "Position", value: p.position },
        { label: "Total", value: p.total },
        { label: "Thru", value: p.thru },
      ];
      p.rounds.forEach((r, ri) =>
        base.push({ label: `Round ${ri + 1}`, value: r }),
      );
      if (board?.eventName)
        base.push({ label: "Event", value: board.eventName });
      return {
        id: p.athleteId ?? `row-${i}`,
        athleteId: p.athleteId,
        name: p.player,
        lead: p.position,
        value: p.total,
        valueColor: colorFor(totalColorTag(p.total)),
        flag: p.flag,
        base,
      };
    });
  } else {
    sectionTitle =
      sl.data?.title ??
      LEADERBOARD_VIEWS.find((v) => v.id === view)?.title ??
      "Season";
    rows = (sl.data?.rows ?? []).map((r) => ({
      id: r.athleteId ?? `rank-${r.rank}`,
      athleteId: r.athleteId,
      name: r.name,
      lead: `#${r.rank}`,
      value: r.value,
      valueColor: Color.PrimaryText,
      medalRank: r.rank,
      base: [
        { label: "Rank", value: `#${r.rank}` },
        { label: sectionTitle, value: r.value },
      ],
    }));
  }

  const empty = !isLoading && rows.length === 0;

  const dropdown = (
    <List.Dropdown tooltip="View" value={view} onChange={setView}>
      <List.Dropdown.Section title="Live">
        <List.Dropdown.Item title="This Tournament" value="tournament" />
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Season Rankings">
        {LEADERBOARD_VIEWS.filter((v) => v.id !== "tournament").map((v) => (
          <List.Dropdown.Item key={v.id} title={v.title} value={v.id} />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && !empty}
      searchBarPlaceholder="Filter players…"
      searchBarAccessory={dropdown}
      navigationTitle={`${sectionTitle} · ${tourTitle(tour)}`}
      onSelectionChange={setSelectedId}
    >
      {error && empty ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't load from ESPN"
          description="The unofficial golf API didn't respond. Try again."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <SwitchTour tour={tour} setTour={setTour} />
            </ActionPanel>
          }
        />
      ) : empty ? (
        <List.EmptyView
          icon={Icon.BarChart}
          title={
            isTournament ? "No tournament data" : "No data for this ranking"
          }
          description={
            isTournament
              ? "Nothing live and no recent event found. Check Golf Season."
              : `${tourTitle(tour)} may not publish “${sectionTitle}”. Try another view or tour.`
          }
          actions={
            <ActionPanel>
              <SwitchTour tour={tour} setTour={setTour} />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section
          title={sectionTitle}
          subtitle={`${tourTitle(tour)} · ${rows.length} players`}
        >
          {rows.map((r) => (
            <List.Item
              key={r.id}
              id={r.id}
              title={r.name}
              subtitle={showingDetail ? undefined : r.lead}
              keywords={[r.name, r.lead]}
              icon={iconFor(r)}
              accessories={[{ tag: { value: r.value, color: r.valueColor } }]}
              detail={
                <PlayerDetailPane
                  tour={tour}
                  athleteId={r.athleteId}
                  active={selectedId === r.id}
                  name={r.name}
                  base={r.base}
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    title={showingDetail ? "Hide Details" : "Show Details"}
                    icon={Icon.Sidebar}
                    onAction={() => setShowingDetail((s) => !s)}
                  />
                  <SwitchTour tour={tour} setTour={setTour} />
                  {isTournament && lb.data?.espnUrl && (
                    <Action.OpenInBrowser url={lb.data.espnUrl} />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Row"
                    content={`${r.lead}  ${r.name}  ${r.value}`}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function SwitchTour({
  tour,
  setTour,
}: {
  tour: TourId;
  setTour: (t: TourId) => void;
}) {
  return (
    <Action
      title="Switch Tour"
      icon={Icon.Globe}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "t" },
        Windows: { modifiers: ["ctrl"], key: "t" },
      }}
      onAction={() => setTour(nextTour(tour))}
    />
  );
}

function iconFor(r: Row) {
  if (r.flag) return { source: r.flag };
  if (r.medalRank === 1)
    return { source: Icon.Trophy, tintColor: Color.Yellow };
  if (r.medalRank === 2)
    return { source: Icon.Trophy, tintColor: Color.SecondaryText };
  if (r.medalRank === 3)
    return { source: Icon.Trophy, tintColor: Color.Orange };
  return { source: Icon.Dot, tintColor: Color.SecondaryText };
}

function colorFor(tag: "red" | "green" | "secondary"): Color {
  if (tag === "red") return Color.Red;
  if (tag === "green") return Color.Green;
  return Color.SecondaryText;
}
