import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useFetch } from "@raycast/utils";

const CALENDAR_URL = "https://www.thelotradio.com/calendar";
const BASE_URL = "https://www.thelotradio.com";

interface Show {
  id: string;
  title: string;
  start: Date;
  end: Date;
  href?: string;
  genres: string[];
  description?: string;
  links: string[];
  recurring: boolean;
}

// Strips HTML tags and decodes common entities from RSC event description strings.
function stripHtml(raw: string): string {
  try {
    const unescaped = JSON.parse('"' + raw + '"') as string;
    return unescaped
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return raw.replace(/<[^>]+>/g, " ").trim();
  }
}

function parseShows(rscText: string): Show[] {
  const shows: Show[] = [];
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" }); // "YYYY-MM-DD"
  const seen = new Set<string>();

  // Match event objects: "event":{"id":"...","summary":"...",...,"start":"...","end":"...",...}
  // Using .*? (non-greedy + dotall) to skip over description and other fields between summary and start.
  const eventPattern = /"event":\{"id":"([^"]+)","summary":"([^"]+)".*?"start":"([^"]+)","end":"([^"]+)"/gs;

  for (const line of rscText.split("\n")) {
    for (const m of line.matchAll(eventPattern)) {
      const [, id, summary, startStr, endStr] = m;

      if (!startStr.startsWith(today)) continue;
      if (seen.has(id)) continue;
      seen.add(id);

      // Episode comes before the event object in the RSC, so look back for href.
      // Genres and links come after "end" in the event JSON, so look forward past m[0].
      const context = line.slice(Math.max(0, (m.index ?? 0) - 300), (m.index ?? 0) + m[0].length + 500);
      const href = context.match(/"href":"([^"]+)"/)?.[1];

      const genresRaw = context.match(/"genres":\[([^\]]*)\]/)?.[1];
      const genres =
        genresRaw
          ?.match(/"([^"]+)"/g)
          ?.map((g) => g.replace(/"/g, ""))
          .filter((g) => g.length > 0) ?? [];

      const linksRaw = context.match(/"links":\[([^\]]*)\]/)?.[1];
      const links =
        linksRaw
          ?.match(/"(https?:\/\/[^"]+)"/g)
          ?.map((l) => l.replace(/"/g, ""))
          .filter((l) => !l.includes("calendar.google.com")) ?? [];

      // "$..." values are RSC chunk references, not real description text.
      const descRaw = m[0].match(/"description":"((?:[^"\\]|\\.)*)"/)?.[1];
      const description = descRaw && !descRaw.startsWith("$") ? stripHtml(descRaw) : undefined;

      const recurring = context.includes('"reccuring":true');

      shows.push({
        id,
        title: summary,
        start: new Date(startStr),
        end: new Date(endStr),
        href,
        genres,
        description,
        links,
        recurring,
      });
    }
  }

  return shows.sort((a, b) => a.start.getTime() - b.start.getTime());
}

// "2-3pm", "11am-12pm", "10pm-12am" — shared period suffix, no spaces.
function formatTimeRange(start: Date, end: Date): string {
  const fmt = (d: Date, showPeriod: boolean): string => {
    const h = d.getHours() % 12 || 12;
    const m = d.getMinutes();
    const period = d.getHours() < 12 ? "am" : "pm";
    const time = m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
    return showPeriod ? `${time}${period}` : time;
  };
  const samePeriod = start.getHours() < 12 === end.getHours() < 12;
  return samePeriod ? `${fmt(start, false)}-${fmt(end, true)}` : `${fmt(start, true)}-${fmt(end, true)}`;
}

function linkLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("instagram.com")) return "Instagram";
    if (host.includes("soundcloud.com")) return "SoundCloud";
    if (host.includes("youtube.com")) return "YouTube";
    if (host.includes("bandcamp.com")) return "Bandcamp";
    if (host.includes("mixcloud.com")) return "Mixcloud";
    if (host.includes("resident-advisor.net") || host.includes("ra.co")) return "Resident Advisor";
    return host;
  } catch {
    return url;
  }
}

function ShowDetail({ show }: { show: Show }) {
  const timeRange = formatTimeRange(show.start, show.end);
  const markdown = [`# ${show.title}`, "", show.description ?? ""].join("\n");

  return (
    <Detail
      navigationTitle={show.title}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Time" icon={Icon.Clock} text={timeRange} />
          {show.genres.length > 0 && (
            <Detail.Metadata.TagList title="Genres">
              {show.genres.map((g) => (
                <Detail.Metadata.TagList.Item key={g} text={g} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {show.recurring && <Detail.Metadata.Label title="Format" icon={Icon.RotateClockwise} text="Recurring show" />}
          {show.links.length > 0 && <Detail.Metadata.Separator />}
          {show.links.map((url) => (
            <Detail.Metadata.Link
              key={url}
              title={linkLabel(url)}
              target={url}
              text={url.replace(/^https?:\/\/(www\.)?/, "")}
            />
          ))}
          {show.href && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link title="Show Page" target={`${BASE_URL}${show.href}`} text="thelotradio.com" />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        show.href ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open Show Page" url={`${BASE_URL}${show.href}`} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function ShowItem({ show, now }: { show: Show; now: Date }) {
  const isNowPlaying = show.start <= now && show.end > now;
  const timeRange = formatTimeRange(show.start, show.end);

  const accessories: List.Item.Accessory[] = [
    ...show.genres.map((genre) => ({ tag: { value: genre, color: Color.Blue } })),
    ...(isNowPlaying ? [{ tag: { value: "Now Playing", color: Color.Green } }] : []),
  ];

  return (
    <List.Item
      title={timeRange}
      subtitle={show.title}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" target={<ShowDetail show={show} />} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const now = new Date();

  const { isLoading, data: shows } = useFetch<Show[]>(CALENDAR_URL, {
    headers: { RSC: "1", Accept: "text/x-component" },
    parseResponse: async (response) => {
      const text = await response.text();
      return parseShows(text);
    },
    keepPreviousData: true,
  });

  const visibleShows = (shows ?? []).filter((s) => s.title !== "RESTREAM");
  const nowPlaying = visibleShows.find((s) => s.start <= now && s.end > now);
  const upcomingShows = visibleShows.filter((s) => s.start > now);
  const pastShows = visibleShows.filter((s) => s.end <= now);

  return (
    <List isLoading={isLoading} navigationTitle="Today's Lineup — The Lot Radio">
      {nowPlaying && (
        <List.Section title="Now Playing">
          <ShowItem key={nowPlaying.id} show={nowPlaying} now={now} />
        </List.Section>
      )}
      {upcomingShows.length > 0 && (
        <List.Section title="Up Next">
          {upcomingShows.map((show) => (
            <ShowItem key={show.id} show={show} now={now} />
          ))}
        </List.Section>
      )}
      {pastShows.length > 0 && (
        <List.Section title="Earlier Today">
          {pastShows.map((show) => (
            <ShowItem key={show.id} show={show} now={now} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
