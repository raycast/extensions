import { writeFile } from "fs/promises";
import { join } from "path";
import { useState } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  Toast,
  environment,
  open,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  EventDetail,
  ScheduleEntry,
  Season,
  TOURS,
  TourId,
  TourSel,
  WATCH_GUIDE,
  buildEventIcs,
  formatDateRange,
  getEventDetail,
  getSeason,
  seasonYears,
  tourSelTitle,
  tourTitle,
  watchRegions,
  watchableIn,
} from "./espn";

// Emoji flags for the "Watchable in…" dropdown section.
const REGION_FLAG: Record<string, string> = {
  US: "🇺🇸",
  "UK & Ireland": "🇬🇧",
  Germany: "🇩🇪",
  Austria: "🇦🇹",
  France: "🇫🇷",
};

// Assemble a branded, detail-rich description for the calendar event from what
// the extension already knows (schedule entry + any loaded detail pane).
function calendarDescription(
  entry: ScheduleEntry,
  detail: EventDetail | undefined,
  tour: TourId,
): string {
  const lines: string[] = [];
  if (entry.majorLabel)
    lines.push(`⛳ Major Championship — ${entry.majorLabel}`);
  else if (detail?.isSignature) lines.push("⭐ Signature Event");
  lines.push(`Tour: ${tourTitle(tour)}`);
  const dates = formatDateRange(
    detail?.startDate ?? entry.startDate,
    detail?.endDate ?? entry.endDate,
  );
  if (dates) lines.push(`Dates: ${dates}`);
  if (detail?.venue) lines.push(`Course: ${detail.venue}`);
  if (detail?.location) lines.push(`Location: ${detail.location}`);
  if (detail?.purse) lines.push(`Purse: ${detail.purse}`);
  if (detail?.defendingChampion)
    lines.push(`Defending champion: ${detail.defendingChampion}`);
  const winner = detail?.winner ?? entry.winner;
  const winnerScore = detail?.winnerScore ?? entry.winnerScore;
  if (winner)
    lines.push(
      `Winner: ${winnerScore ? `${winner} (${winnerScore})` : winner}`,
    );
  if (detail?.weather) lines.push(`Forecast: ${detail.weather}`);
  if (detail?.broadcast) lines.push(`On TV (US): ${detail.broadcast}`);

  const watch = WATCH_GUIDE[tour] ?? [];
  if (watch.length) {
    lines.push("");
    lines.push("Where to watch (guide — rights vary by region & season):");
    for (const w of watch) lines.push(`• ${w.region}: ${w.networks}`);
  }
  if (detail?.espnUrl) {
    lines.push("");
    lines.push(`Leaderboard: ${detail.espnUrl}`);
  }
  lines.push("");
  lines.push("Tracked with sir.golf · https://sir.golf/");
  return lines.join("\n");
}

// Write an .ics for the event to the extension's support dir and hand it to the
// OS (Calendar.app imports it) — fully local, no backend, matches the $0 constraint.
async function addToCalendar(entry: ScheduleEntry, detail?: EventDetail) {
  try {
    const tour = entry.tour ?? "pga";
    const ics = buildEventIcs({
      uid: `${tour}-${entry.id ?? entry.name}`,
      name: `${entry.name} (${tourTitle(tour)}) [sir.golf]`,
      startDate: detail?.startDate ?? entry.startDate,
      endDate: detail?.endDate ?? entry.endDate,
      location: detail?.location ?? detail?.venue,
      url: detail?.espnUrl,
      description: calendarDescription(entry, detail, tour),
    });
    const safe = (entry.id ?? entry.name).replace(/[^a-z0-9]+/gi, "-");
    const file = join(environment.supportPath, `golf-${safe}.ics`);
    await writeFile(file, ics, "utf8");
    await open(file);
    await showToast({ style: Toast.Style.Success, title: "Added to calendar" });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't create calendar event",
    });
  }
}

// Compact range for list rows: "Jul 11-16", or "Jul 28-Aug 2" across months.
function compactDateRange(start?: string, end?: string): string {
  if (!start) return "";
  const month = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { month: "short" });
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: "numeric" });
  if (!end) return `${month(start)} ${day(start)}`;
  if (month(start) === month(end))
    return `${month(start)} ${day(start)}-${day(end)}`;
  return `${month(start)} ${day(start)}-${month(end)} ${day(end)}`;
}

export default function Command() {
  const years = seasonYears();
  const currentYear = years[0];
  const [tour, setTour] = useState<TourSel>("all");
  const [region, setRegion] = useState<string | null>(null);
  const [year, setYear] = useState<number>(currentYear);
  const [showingDetail, setShowingDetail] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error, revalidate } = useCachedPromise(
    getSeason,
    [tour, year],
    {
      keepPreviousData: true,
    },
  );

  const season: Season = data ?? { entries: [], logos: {} };
  const isCurrent = year === currentYear;
  const combined = tour === "all";

  // When a region is selected, keep only events its tour broadcasts there.
  const visible = region
    ? season.entries.filter((e) => watchableIn(e.tour ?? "pga", region))
    : season.entries;

  const current = visible.filter((e) => e.state === "current");
  const upcoming = visible.filter((e) => e.state === "upcoming");
  const past = visible.filter((e) => e.state === "past");

  const empty = !isLoading && visible.length === 0;

  // One search-bar dropdown (Raycast allows only one): a Tour section plus a
  // "Watchable in…" region section. Picking a tour clears the region and vice
  // versa. Season year is changed via ⌘[ / ⌘] actions.
  const filterValue = region ? `region:${region}` : `tour:${tour}`;
  const dropdown = (
    <List.Dropdown
      tooltip="Filter"
      value={filterValue}
      onChange={(v) => {
        if (v.startsWith("region:")) {
          setRegion(v.slice("region:".length));
          setTour("all");
        } else {
          setRegion(null);
          setTour(v.slice("tour:".length) as TourSel);
        }
      }}
    >
      <List.Dropdown.Section title="Tour">
        <List.Dropdown.Item title="All Tours" value="tour:all" />
        {TOURS.map((t) => (
          <List.Dropdown.Item
            key={t.id}
            title={t.title}
            value={`tour:${t.id}`}
          />
        ))}
      </List.Dropdown.Section>
      <List.Dropdown.Section title="Watchable in…">
        {watchRegions().map((r) => (
          <List.Dropdown.Item
            key={r}
            title={REGION_FLAG[r] ? `${REGION_FLAG[r]} ${r}` : r}
            value={`region:${r}`}
          />
        ))}
      </List.Dropdown.Section>
    </List.Dropdown>
  );

  const seasonNav = <SeasonNav year={year} years={years} setYear={setYear} />;

  const filterLabel = region ? `Watchable in ${region}` : tourSelTitle(tour);

  const sections: {
    title: string;
    entries: ScheduleEntry[];
    icon: Icon;
    tint: Color;
  }[] = isCurrent
    ? [
        {
          title: "This Week",
          entries:
            current.length > 0 ? current : upcoming.slice(0, combined ? 3 : 1),
          icon: Icon.Dot,
          tint: Color.Green,
        },
        {
          title: "Upcoming",
          entries:
            current.length > 0 ? upcoming : upcoming.slice(combined ? 3 : 1),
          icon: Icon.Calendar,
          tint: Color.SecondaryText,
        },
        {
          title: "Recent",
          entries: past.slice(-6).reverse(),
          icon: Icon.CheckCircle,
          tint: Color.SecondaryText,
        },
      ]
    : [
        {
          title: `${year} Results`,
          entries: [...past].reverse(),
          icon: Icon.Trophy,
          tint: Color.SecondaryText,
        },
      ];

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && !empty}
      searchBarPlaceholder="Filter tournaments…"
      searchBarAccessory={dropdown}
      navigationTitle={`Golf Season · ${filterLabel} · ${year}`}
      onSelectionChange={setSelectedId}
    >
      {error && empty ? (
        <List.EmptyView
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title="Couldn't load the schedule"
          description="ESPN's unofficial golf API didn't respond. Try again."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              {seasonNav}
            </ActionPanel>
          }
        />
      ) : empty ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No schedule available"
          description={`No ${filterLabel} events found for ${year}.`}
          actions={<ActionPanel>{seasonNav}</ActionPanel>}
        />
      ) : (
        sections.map((s) =>
          s.entries.length === 0 ? null : (
            <List.Section key={s.title} title={s.title}>
              {s.entries.map((e, i) => {
                const id = `${e.tour ?? ""}-${e.id ?? `${s.title}-${i}`}`;
                const eventTour: TourId = e.tour ?? "pga";
                const logo = season.logos[eventTour];
                return (
                  <EventItem
                    key={id}
                    id={id}
                    entry={e}
                    eventTour={eventTour}
                    logo={logo ? { source: logo } : undefined}
                    fallbackIcon={s.icon}
                    fallbackTint={s.tint}
                    active={selectedId === id}
                    showingDetail={showingDetail}
                    onToggleDetail={() => setShowingDetail((v) => !v)}
                    seasonNav={seasonNav}
                    revalidate={revalidate}
                  />
                );
              })}
            </List.Section>
          ),
        )
      )}
    </List>
  );
}

function EventItem(props: {
  id: string;
  entry: ScheduleEntry;
  eventTour: TourId;
  logo?: Image.ImageLike;
  fallbackIcon: Icon;
  fallbackTint: Color;
  active: boolean;
  showingDetail: boolean;
  onToggleDetail: () => void;
  seasonNav: React.ReactNode;
  revalidate: () => void;
}) {
  const {
    entry,
    eventTour,
    logo,
    fallbackIcon,
    fallbackTint,
    active,
    showingDetail,
    onToggleDetail,
    seasonNav,
    revalidate,
  } = props;

  const { data, isLoading } = useCachedPromise(
    getEventDetail,
    [eventTour, entry.id ?? ""],
    {
      execute: active && !!entry.id,
      keepPreviousData: true,
    },
  );

  const winner = data?.winner ?? entry.winner;
  const winnerScore = data?.winnerScore ?? entry.winnerScore;

  // Tours are distinguished by their logo icon, so the row just carries the
  // date range; majors get a star, and the winner trophy shows only when the
  // detail pane is closed (room is tight with it open).
  const accessories: List.Item.Accessory[] = [];
  if (entry.isMajor)
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Purple },
      tooltip: `${entry.majorLabel ?? "Major"} · Major Championship`,
    });
  if (!showingDetail && winner)
    accessories.push({ tag: { value: `🏆 ${winner}`, color: Color.Yellow } });
  accessories.push({ text: compactDateRange(entry.startDate, entry.endDate) });

  return (
    <List.Item
      id={props.id}
      title={entry.name}
      icon={logo ?? { source: fallbackIcon, tintColor: fallbackTint }}
      accessories={accessories}
      detail={
        <List.Item.Detail
          isLoading={active && !!entry.id && isLoading}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Tour"
                text={tourTitle(eventTour)}
              />
              <List.Item.Detail.Metadata.Label
                title="Dates"
                text={formatDateRange(
                  data?.startDate ?? entry.startDate,
                  data?.endDate ?? entry.endDate,
                )}
              />
              {winner && (
                <List.Item.Detail.Metadata.Label
                  title="Winner"
                  text={winnerScore ? `${winner} (${winnerScore})` : winner}
                  icon={{ source: Icon.Trophy, tintColor: Color.Yellow }}
                />
              )}
              {data?.venue && (
                <List.Item.Detail.Metadata.Label
                  title="Course"
                  text={data.venue}
                />
              )}
              {data?.location && (
                <List.Item.Detail.Metadata.Label
                  title="Location"
                  text={data.location}
                />
              )}
              {data?.purse && (
                <List.Item.Detail.Metadata.Label
                  title="Purse"
                  text={data.purse}
                />
              )}
              {(entry.isMajor || data?.isSignature) && (
                <List.Item.Detail.Metadata.TagList title="Type">
                  {entry.isMajor && (
                    <List.Item.Detail.Metadata.TagList.Item
                      text={entry.majorLabel ?? "Major Championship"}
                      color={Color.Purple}
                    />
                  )}
                  {data?.isSignature && (
                    <List.Item.Detail.Metadata.TagList.Item
                      text="Signature Event"
                      color={Color.Yellow}
                    />
                  )}
                </List.Item.Detail.Metadata.TagList>
              )}
              {data?.defendingChampion && (
                <List.Item.Detail.Metadata.Label
                  title="Defending Champion"
                  text={data.defendingChampion}
                />
              )}
              {data?.weather && (
                <List.Item.Detail.Metadata.Label
                  title="Forecast"
                  text={data.weather}
                />
              )}

              <List.Item.Detail.Metadata.Separator />
              {data?.broadcast && (
                <List.Item.Detail.Metadata.Label
                  title="On TV · US"
                  text={data.broadcast}
                />
              )}
              {(WATCH_GUIDE[eventTour] ?? [])
                .filter((w) => !(data?.broadcast && w.region === "US"))
                .map((w) => (
                  <List.Item.Detail.Metadata.Label
                    key={w.region}
                    title={`Watch · ${w.region}`}
                    text={w.networks}
                  />
                ))}
              <List.Item.Detail.Metadata.Label
                title=" "
                text="Guide only — rights vary by region & season"
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {data?.espnUrl && <Action.OpenInBrowser url={data.espnUrl} />}
          <Action
            title="Add to Calendar"
            icon={Icon.Calendar}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "a" },
              Windows: { modifiers: ["ctrl", "shift"], key: "a" },
            }}
            onAction={() => addToCalendar(entry, data)}
          />
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            onAction={onToggleDetail}
          />
          {seasonNav}
          <Action.CopyToClipboard
            title="Copy"
            content={`${entry.name} — ${formatDateRange(entry.startDate, entry.endDate)}${winner ? ` — won by ${winner}` : ""}`}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}

function SeasonNav({
  year,
  years,
  setYear,
}: {
  year: number;
  years: number[];
  setYear: (y: number) => void;
}) {
  const min = years[years.length - 1];
  const max = years[0];
  return (
    <>
      <Action
        title="Older Season"
        icon={Icon.ChevronLeft}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "[" },
          Windows: { modifiers: ["ctrl"], key: "[" },
        }}
        onAction={() => setYear(Math.max(min, year - 1))}
      />
      <Action
        title="Newer Season"
        icon={Icon.ChevronRight}
        shortcut={{
          macOS: { modifiers: ["cmd"], key: "]" },
          Windows: { modifiers: ["ctrl"], key: "]" },
        }}
        onAction={() => setYear(Math.min(max, year + 1))}
      />
    </>
  );
}
