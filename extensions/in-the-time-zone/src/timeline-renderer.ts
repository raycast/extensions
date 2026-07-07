import { DateTime } from "luxon";
import { formatDelta, formatGmtOffset } from "./time-utils";
import { getCityName, getTimezone } from "./timezones";

export interface TimelineConfig {
  baseISO: string;
  baseCityId: string | null;
  selectedZoneIds: string[];
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

function getDayDiff(localTime: DateTime, baseTime: DateTime): string {
  // Compare date-only values so leap years are handled correctly.
  const localDay = DateTime.utc(localTime.year, localTime.month, localTime.day).startOf("day").toMillis();
  const baseDay = DateTime.utc(baseTime.year, baseTime.month, baseTime.day).startOf("day").toMillis();
  const diff = Math.round((localDay - baseDay) / (24 * 60 * 60 * 1000));

  if (diff === 0) return "";
  if (diff > 0) return ` +${diff}`;
  return ` ${diff}`;
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
      zoneId,
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
    const isBase = !!baseCityId && row.zoneId === baseCityId;
    const deltaStr = isBase ? "(base)" : formatDelta(row.offsetMinutes, "text");
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
