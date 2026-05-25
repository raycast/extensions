/**
 * Per-platform posting heatmaps, transcribed by eye from the heatmap images at
 * https://buffer.com/resources/best-time-to-post-social-media/
 *
 * Each grid below is the visual representation of Buffer's chart. One char per
 * (day, hour) cell:
 *
 *   _  poor      (lightest 1–2 shades on Buffer's gradient)
 *   .  ok        (middle shade)
 *   o  good      (darker cells)
 *   #  best      (the darkest cells Buffer highlights)
 *
 * Buffer's charts only show 6am–10pm. Hours 0–5 and 23 are filled with 0
 * (poor) by the parser.
 *
 * Grid format:
 *   - 7 rows, one per day, in order Mon Tue Wed Thu Fri Sat Sun
 *   - each row is exactly 17 cells, one per hour from 6am (left) → 10pm (right)
 *   - whitespace between cells is allowed and ignored
 *
 * NOTE on timezone: Buffer labels the Facebook/Instagram/LinkedIn/TikTok/X/
 * Threads charts as LOCAL TIME, and the two YouTube charts as UTC. Buffer's
 * narrative copy still says "all times are presented in local time zones (no
 * conversion needed)", so we treat every grid as local. If you want strict UTC
 * handling for YouTube, add a `timezone: "UTC"` field per platform and shift
 * in compute.ts.
 */

export type Intensity = 0 | 1 | 2 | 3;
export type Heatmap = Intensity[][]; // [day 0=Mon..6=Sun][hour 0..23]

/**
 * Everything we know about one platform — heatmap data plus display metadata.
 * Having all this on a single object means adding or renaming a platform is a
 * one-edit operation rather than touching five parallel lookup tables.
 *
 * Field reference:
 *   - id              short slug used as map key + LocalStorage entry
 *   - name            display name in the UI
 *   - notes           prose description shown in the heatmap detail view
 *   - heatmap         7×24 grid, see Heatmap above
 *   - iconSvg         filename in assets/ (a Simple-Icons brand glyph)
 *   - brandColor      hex used in "Brand color" icon mode; #000000 signals
 *                     "no real color" and the renderer falls back to a
 *                     theme-adaptive neutral
 *   - postUrl         default URL for the "Post on …" action
 *   - postUrlPrefKey  Prefs field name where a user override lives
 *   - bufferAnchor    anchor fragment appended to Buffer's source URL
 */
export type Platform = {
  id: string;
  name: string;
  notes: string;
  heatmap: Heatmap;
  iconSvg: string;
  brandColor: string;
  postUrl: string;
  postUrlPrefKey: string;
  bufferAnchor: string;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type DayName = (typeof DAYS)[number];
export const DAY_NAMES: readonly DayName[] = DAYS;

const CHAR_TO_INTENSITY: Record<string, Intensity> = {
  _: 0,
  ".": 1,
  o: 2,
  "#": 3,
};

/**
 * Parse a multi-line string grid into a Heatmap.
 *
 * Each non-blank line must start with a day name (Mon..Sun) followed by
 * exactly 17 cell characters. Whitespace between cells is ignored.
 * Throws loudly on any malformed input — better to fail at module load than
 * to silently produce wrong slots.
 */
function grid(input: string): Heatmap {
  const rows = new Map<DayName, Intensity[]>();

  for (const rawLine of input.split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("//")) continue;

    const match = line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(.+)$/);
    if (!match) {
      throw new Error(
        `grid: line does not start with a day name: ${JSON.stringify(rawLine)}`,
      );
    }
    const day = match[1] as DayName;
    const cells = match[2].replace(/\s+/g, "");

    if (cells.length !== 17) {
      throw new Error(
        `grid: ${day} has ${cells.length} cells, expected 17 (hours 6am–10pm). Line: ${JSON.stringify(rawLine)}`,
      );
    }

    const dayRow: Intensity[] = new Array(24).fill(0);
    for (let i = 0; i < 17; i++) {
      const ch = cells[i];
      const v = CHAR_TO_INTENSITY[ch];
      if (v === undefined) {
        throw new Error(
          `grid: ${day} pos ${i} has invalid char ${JSON.stringify(ch)} — use _ . o #`,
        );
      }
      dayRow[i + 6] = v; // hours 6..22
    }
    rows.set(day, dayRow);
  }

  const missing = DAYS.filter((d) => !rows.has(d));
  if (missing.length > 0) {
    throw new Error(`grid: missing rows for ${missing.join(", ")}`);
  }

  return DAYS.map((d) => rows.get(d)!) as Heatmap;
}

// ─── Heatmaps ──────────────────────────────────────────────────────────────
// Each row covers hours 6am → 10pm (17 cells). Column guide:
//
//                  6 7 8 9 10  12  2  4  6  8  10
//                  a a a a am  pm  pm pm pm pm pm
//                  ▼ ▼ ▼ ▼ ▼   ▼   ▼  ▼  ▼  ▼  ▼

const facebook = grid(`
  Mon  .................
  Tue  ..ooo.......oooo.
  Wed  ..ooo....oooooo..
  Thu  ..###o..o..oo....
  Fri  ...oo............
  Sat  .................
  Sun  ....o............
`);

const instagram = grid(`
  Mon  ............oooo.
  Tue  ..oo....o#ooooo..
  Wed  ..#ooo#...oo#ooo.
  Thu  ..o#o.....ooooo..
  Fri  .................
  Sat  .................
  Sun  .................
`);

const linkedin = grid(`
  Mon  .........oooo....
  Tue  ......oooo.oooo..
  Wed  ........oo#oooo..
  Thu  ......oooooooo...
  Fri  ........o##ooo...
  Sat  ....o.......oo...
  Sun  ..........oo.....
`);

const tiktok = grid(`
  Mon  ..oooo..o...oooo.
  Tue  ............oooo.
  Wed  .................
  Thu  ............oooo.
  Fri  ............oooo.
  Sat  ..oooooo....ooooo
  Sun  ..o#ooo.....ooooo
`);

const ytShorts = grid(`
  Mon  ............oooo.
  Tue  ..............oo.
  Wed  .............ooo.
  Thu  .............oooo
  Fri  ..........#o#oooo
  Sat  ....o.......ooooo
  Sun  ............ooooo
`);

const ytLong = grid(`
  Mon  ..ooo........oooo
  Tue  ..oooo......ooooo
  Wed  .................
  Thu  ............ooooo
  Fri  ..oo.o......ooooo
  Sat  ....oooo..ooooooo
  Sun  ..o##oooooooooooo
`);

const x = grid(`
  Mon  ..ooooo..........
  Tue  ..o##oo..........
  Wed  ..oo#oo..........
  Thu  ..oooo...........
  Fri  ..ooo............
  Sat  .................
  Sun  .................
`);

const threads = grid(`
  Mon  ..oooo...........
  Tue  ..o##oo..........
  Wed  ..o##o#..........
  Thu  ..###oo..........
  Fri  ..oo#oo..........
  Sat  .................
  Sun  .................
`);

export const PLATFORMS: readonly Platform[] = [
  {
    id: "facebook",
    name: "Facebook",
    notes:
      "Best days Wed–Thu. Morning peak through midday, early-evening spike. Avoid Saturday.",
    heatmap: facebook,
    iconSvg: "facebook.svg",
    brandColor: "#0866FF",
    postUrl: "https://www.facebook.com/",
    postUrlPrefKey: "postUrlFacebook",
    bufferAnchor: "#best-time-to-post-on-facebook",
  },
  {
    id: "instagram",
    name: "Instagram",
    notes:
      "Strong early mornings Wed/Thu, 6pm spike most days. Friday is the weak day; weekends underperform.",
    heatmap: instagram,
    iconSvg: "instagram.svg",
    brandColor: "#E4405F",
    postUrl: "https://www.instagram.com/",
    postUrlPrefKey: "postUrlInstagram",
    bufferAnchor: "#best-time-to-post-on-instagram",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    notes:
      "Afternoon and evening now beat traditional workday hours. Avoid 6–11 a.m. Weekends surprisingly strong.",
    heatmap: linkedin,
    iconSvg: "linkedin.svg",
    brandColor: "#0A66C2",
    postUrl: "https://www.linkedin.com/feed/?shareActive=true",
    postUrlPrefKey: "postUrlLinkedin",
    bufferAnchor: "#best-time-to-post-on-linkedin",
  },
  {
    id: "tiktok",
    name: "TikTok",
    notes:
      "Evenings 6–11 p.m. and weekend mornings. Wednesday is the weakest day.",
    heatmap: tiktok,
    iconSvg: "tiktok.svg",
    brandColor: "#000000",
    postUrl: "https://www.tiktok.com/upload",
    postUrlPrefKey: "postUrlTiktok",
    bufferAnchor: "#best-time-to-post-on-tiktok",
  },
  {
    id: "youtube-shorts",
    name: "YouTube Shorts",
    notes: "Evenings 6–11 p.m. optimal. Tuesday lowest, Monday weak.",
    heatmap: ytShorts,
    iconSvg: "youtubeshorts.svg",
    brandColor: "#FF0000",
    postUrl: "https://www.youtube.com/upload",
    postUrlPrefKey: "postUrlYoutubeShorts",
    bufferAnchor: "#best-time-to-post-youtube-shorts",
  },
  {
    id: "youtube-long",
    name: "YouTube (Long-form)",
    notes: "Morning slots 8–11 a.m. strongest. Midweek afternoons quietest.",
    heatmap: ytLong,
    iconSvg: "youtube.svg",
    brandColor: "#FF0000",
    postUrl: "https://studio.youtube.com/",
    postUrlPrefKey: "postUrlYoutubeLong",
    bufferAnchor: "#best-time-to-post-long-form-youtube-videos",
  },
  {
    id: "x",
    name: "X (Twitter)",
    notes:
      "Weekday mornings 8–11 a.m. peak; afternoons decline. Saturday is the quietest day.",
    heatmap: x,
    iconSvg: "x.svg",
    brandColor: "#000000",
    postUrl: "https://x.com/compose/post",
    postUrlPrefKey: "postUrlX",
    bufferAnchor: "#best-time-to-post-on-x-formerly-twitter",
  },
  {
    id: "threads",
    name: "Threads",
    notes:
      "Weekday mornings optimal. Engagement drops significantly on weekends.",
    heatmap: threads,
    iconSvg: "threads.svg",
    brandColor: "#000000",
    postUrl: "https://www.threads.net/",
    postUrlPrefKey: "postUrlThreads",
    bufferAnchor: "#best-time-to-post-on-threads",
  },
];

export function platformById(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}
