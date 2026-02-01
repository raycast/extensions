import { DateTime } from "luxon";
import { getCityName, getTimezone } from "./timezones";

export interface TimelineConfig {
  baseISO: string;
  baseCityId: string | null;
  selectedZoneIds: string[];
}

interface TimelineRow {
  cityName: string;
  localTime: DateTime;
  blocks: string;
  timeStr: string;
  dayDiff: string;
}

type HourType = "work" | "sleep" | "marginal";

const BLOCK_CHARS: Record<HourType, string> = {
  work: "🟩",
  sleep: "🟥",
  marginal: "🟨",
};

function getHourType(hour: number): HourType {
  // Matches existing getTimeColor logic from time-slider.tsx
  if (hour >= 0 && hour < 7) return "sleep";
  if (hour >= 9 && hour < 17) return "work";
  return "marginal";
}

function getBlockChar(hour: number): string {
  return BLOCK_CHARS[getHourType(hour)];
}

function generateHourBlocks(startHour: number): string {
  // Generate 12 blocks representing 2-hour windows starting from the given hour
  let blocks = "";
  for (let i = 0; i < 12; i++) {
    const hour = (startHour + i * 2) % 24;
    blocks += getBlockChar(hour);
  }
  return blocks;
}

function getDayDiff(localTime: DateTime, baseTime: DateTime): string {
  // Compare calendar dates in their respective timezones
  // Using ordinal (day-of-year) ensures we compare calendar days, not absolute timestamps
  const localDays = localTime.year * 365 + localTime.ordinal;
  const baseDays = baseTime.year * 365 + baseTime.ordinal;
  const diff = localDays - baseDays;

  if (diff === 0) return "";
  if (diff > 0) return ` +${diff}`;
  return ` ${diff}`;
}

export function generateTimelineMarkdown(config: TimelineConfig): string {
  const { baseISO, baseCityId, selectedZoneIds } = config;

  const baseZoneId = baseCityId ? getTimezone(baseCityId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseTime = DateTime.fromISO(baseISO).setZone(baseZoneId);

  // Build all timezone rows including the base
  const allZoneIds = baseCityId ? [baseCityId, ...selectedZoneIds.filter((id) => id !== baseCityId)] : selectedZoneIds;

  const rows: TimelineRow[] = allZoneIds.map((zoneId) => {
    const tz = getTimezone(zoneId);
    const localTime = DateTime.fromISO(baseISO).setZone(tz);
    const cityName = getCityName(zoneId);

    // Calculate which hour starts the day for this timezone
    // We show 24 hours starting from midnight (hour 0) of that timezone
    const startHour = 0;

    return {
      cityName,
      localTime,
      blocks: generateHourBlocks(startHour),
      timeStr: localTime.toFormat("h:mm a"),
      dayDiff: getDayDiff(localTime, baseTime),
    };
  });

  // Find max city name length for alignment
  const maxCityLen = Math.max(...rows.map((r) => r.cityName.length), 6);

  // Build the markdown
  let md = "# Timeline\n\n";
  md += "```\n";

  // Header row with hour labels
  const header = " ".repeat(maxCityLen + 2) + "00  02  04  06  08  10  12  14  16  18  20  22";
  md += header + "\n";

  // Separator row
  const separator = " ".repeat(maxCityLen + 2) + "|   |   |   |   |   |   |   |   |   |   |   |";
  md += separator + "\n";

  // Timezone rows
  for (const row of rows) {
    const cityPadded = row.cityName.padEnd(maxCityLen);
    const timeWithDay = row.timeStr + (row.dayDiff ? row.dayDiff : "");
    md += `${cityPadded}  ${row.blocks}  ${timeWithDay}\n`;
  }

  // Current time marker row - find position based on base time hour
  const currentHour = baseTime.hour;
  const markerPosition = Math.floor(currentHour / 2); // Which 2-hour block
  const markerSpaces = maxCityLen + 2 + markerPosition * 2;
  md += " ".repeat(markerSpaces) + "▼\n";

  md += "```\n";

  // Add helpful text below
  md += "\n*Use ← → to scrub time, Cmd+L to switch views*";

  return md;
}

export function generateCompactTimelineMarkdown(config: TimelineConfig): string {
  const { baseISO, baseCityId, selectedZoneIds } = config;

  const baseZoneId = baseCityId ? getTimezone(baseCityId) : Intl.DateTimeFormat().resolvedOptions().timeZone;
  const baseTime = DateTime.fromISO(baseISO).setZone(baseZoneId);

  // Build all timezone rows
  const allZoneIds = baseCityId ? [baseCityId, ...selectedZoneIds.filter((id) => id !== baseCityId)] : selectedZoneIds;

  const rows = allZoneIds.map((zoneId) => {
    const tz = getTimezone(zoneId);
    const localTime = DateTime.fromISO(baseISO).setZone(tz);
    const cityName = getCityName(zoneId);
    const offsetFromBase = localTime.offset - baseTime.offset;

    // Pad single-digit hours with a leading space so colons align
    const rawTime = localTime.toFormat("h:mm a");
    const paddedTime = rawTime.padStart(8, " ");

    return {
      cityName,
      localTime,
      offsetMinutes: offsetFromBase,
      timeStr: paddedTime,
      dayDiff: getDayDiff(localTime, baseTime),
    };
  });

  let md = "";

  // 24 blocks, one per hour, centered at position 12
  const numBlocks = 24;
  const centerIndex = 12;

  // Emojis are 2 characters wide, so center of |X| marker is at:
  // (12 blocks * 2 chars) + 2 (for '|' + emoji center) + offset for rendering
  const centerCharPos = centerIndex * 2 + 5;

  // Find max city name length for consistent left column
  const maxCityLen = Math.max(...rows.map((r) => r.cityName.length), 8);

  md += "```\n";

  // NOW header - centered above the |X| marker
  const nowLabel = "▼ NOW ▼";
  const nowPadding = Math.max(0, centerCharPos - Math.floor(nowLabel.length / 2));
  md += " ".repeat(nowPadding) + nowLabel + "\n";

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const isLast = rowIndex === rows.length - 1;

    // Build label: CityName [padded] TimeLabel [padded] GMT Delta
    const isBase = row.offsetMinutes === 0;
    const deltaStr = isBase ? "(base)" : formatDelta(row.offsetMinutes);
    const gmtStr = formatGmtOffset(row.localTime.offset);
    const rightInfo = `${gmtStr}  ${deltaStr}`;

    // Time label centered above the |X| marker (day indicator appended after, doesn't affect centering)
    const timeOnly = row.timeStr;
    const timeStartPos = centerCharPos - Math.floor(timeOnly.length / 2);
    const timeEndPos = timeStartPos + timeOnly.length;

    // City name padded to fixed width
    const cityPadded = row.cityName.padEnd(maxCityLen);

    // Calculate padding from city to time
    const paddingToTime = Math.max(2, timeStartPos - maxCityLen);

    // Day indicator comes right after time (doesn't shift centering)
    const dayIndicator = row.dayDiff || "";

    // Calculate padding from time+day to right info (put it after the blocks end)
    const blocksEndPos = numBlocks * 2 + 2; // 24 blocks * 2 + 2 for ||
    const paddingToRight = Math.max(2, blocksEndPos - timeEndPos - dayIndicator.length + 2);

    md +=
      cityPadded + " ".repeat(paddingToTime) + timeOnly + dayIndicator + " ".repeat(paddingToRight) + rightInfo + "\n";

    // 24 blocks with |X| around the current hour
    let blocks = "";
    for (let i = 0; i < numBlocks; i++) {
      const hoursFromCenter = i - centerIndex;
      const hour = (((row.localTime.hour + hoursFromCenter) % 24) + 24) % 24;
      const block = getBlockChar(hour);

      if (i === centerIndex) {
        blocks += `|${block}|`;
      } else {
        blocks += block;
      }
    }

    // No extra blank line after the last city
    md += blocks + (isLast ? "\n" : "\n\n");
  }

  md += "```";

  return md;
}

function formatGmtOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `GMT${sign}${hours}`;
  }
  return `GMT${sign}${hours}:${String(minutes).padStart(2, "0")}`;
}

function formatDelta(diffMinutes: number): string {
  if (diffMinutes === 0) return "same";
  const sign = diffMinutes > 0 ? "+" : "-";
  const abs = Math.abs(diffMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (minutes === 0) {
    return `${sign}${hours} hr${hours !== 1 ? "s" : ""}`;
  }
  return `${sign}${hours}h ${minutes}m`;
}
