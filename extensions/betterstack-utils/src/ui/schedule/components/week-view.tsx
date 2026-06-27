import React, { Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCurrentWeekDays, isSameDay } from "../../../common/dates";
import { buildColorMap, Colors, getTextColor, RotaColors } from "../../../common/colors";
import { formatUserName, OnCallEvent } from "../../../domain/on-call-event";
import { formatWeekday, truncateLabel } from "../../layout";
import { FONT_FAMILY, MONO_FONT_FAMILY } from "../../../common/font";
import { ON_CALL_PILL_CIRC_R, OnCallPill } from "./on-call-pill";

const GRID_COLOR = Colors.GRID;
const TEXT_DIM = Colors.DIM;

const WEEK = {
  WIDTH: 1160,
  SIDEBAR_WIDTH: 25,
  HEADER_HEIGHT: 44,
  HOURS: 24,
  HOUR_HEIGHT: 20,
  TIMELINE_HEIGHT: 24 * 20,
  TOTAL_HEIGHT: 44 + 24 * 20,
  DAY_WIDTH: (1160 - 25) / 7,
  MIN_EVENT_HEIGHT: 12,
  LABEL_MIN_HEIGHT: 24,
  FONT: FONT_FAMILY,
} as const;

export interface DaySegment {
  startFraction: number;
  endFraction: number;
  label: string;
  color: string;
}

export function getDaySegments(events: OnCallEvent[], dayStart: Date, colorMap: Map<string, string>): DaySegment[] {
  const DAY_MS = 24 * 3600 * 1000;
  const dayStartMs = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate()).getTime();
  const dayEndMs = dayStartMs + DAY_MS;

  return events.flatMap((event) => {
    const eventStart = new Date(event.started_at).getTime();
    const eventEnd = new Date(event.ended_at).getTime();
    const segStart = Math.max(eventStart, dayStartMs);
    const segEnd = Math.min(eventEnd, dayEndMs);
    if (segEnd <= segStart) return [];
    const name = formatUserName(event.user);
    return [
      {
        startFraction: (segStart - dayStartMs) / DAY_MS,
        endFraction: (segEnd - dayStartMs) / DAY_MS,
        label: name,
        color: colorMap.get(name) ?? RotaColors.GREEN,
      },
    ];
  });
}

interface WeekViewProps {
  events: OnCallEvent[];
  today: Date;
  anchorDate?: Date;
  backgroundColor?: string;
  allEvents?: OnCallEvent[];
  onCallName?: string;
  onCallColor?: string;
}

function WeekViewSvg({
  events,
  today,
  anchorDate,
  backgroundColor,
  allEvents,
  onCallName,
  onCallColor,
}: WeekViewProps) {
  const weekAnchor = anchorDate ?? today;
  const days = getCurrentWeekDays(weekAnchor);
  const colorSourceEvents = allEvents ?? events;
  const uniqueNames = [...new Set(colorSourceEvents.map((e) => formatUserName(e.user)))].sort();
  const colorMap = buildColorMap(uniqueNames);
  const todayIndex = days.findIndex((d) => isSameDay(d, today));

  const bannerHeight = onCallName && onCallColor ? ON_CALL_PILL_CIRC_R * 2 : 0;
  const headerTop = bannerHeight;
  const gridTop = bannerHeight + WEEK.HEADER_HEIGHT;
  const totalHeight = WEEK.TOTAL_HEIGHT + bannerHeight;

  const todayStartMs = todayIndex >= 0 ? new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() : 0;
  const nowFraction = todayIndex >= 0 ? (today.getTime() - todayStartMs) / (24 * 3600 * 1000) : 0;
  const markerY = gridTop + nowFraction * WEEK.TIMELINE_HEIGHT;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={WEEK.WIDTH}
      height={totalHeight}
      viewBox={`0 0 ${WEEK.WIDTH} ${totalHeight}`}
    >
      {/* Background */}
      <rect width={WEEK.WIDTH} height={totalHeight} fill={backgroundColor ?? "transparent"} />

      {/* Hour grid lines */}
      {Array.from({ length: WEEK.HOURS }, (_, i) => (
        <line
          key={`hg${i}`}
          x1={WEEK.SIDEBAR_WIDTH}
          y1={gridTop + i * WEEK.HOUR_HEIGHT}
          x2={WEEK.WIDTH}
          y2={gridTop + i * WEEK.HOUR_HEIGHT}
          stroke={GRID_COLOR}
          strokeWidth={1}
        />
      ))}

      {/* Hour labels — Menlo for consistent digit metrics */}
      {Array.from({ length: WEEK.HOURS }, (_, i) => (
        <text
          key={`hl${i}`}
          x={WEEK.SIDEBAR_WIDTH - 4}
          y={gridTop + i * WEEK.HOUR_HEIGHT + WEEK.HOUR_HEIGHT / 2}
          textAnchor="end"
          dominantBaseline="central"
          fontSize={10}
          fill={TEXT_DIM}
          fontFamily={MONO_FONT_FAMILY}
        >
          {i}
        </text>
      ))}

      {/* Day columns: separator + header + labels */}
      {days.map((day, i) => {
        const isToday = isSameDay(day, today);
        const colX = WEEK.SIDEBAR_WIDTH + i * WEEK.DAY_WIDTH;
        const centerX = colX + WEEK.DAY_WIDTH / 2;
        return (
          <Fragment key={`col${i}`}>
            <line x1={colX} y1={gridTop} x2={colX} y2={totalHeight} stroke={GRID_COLOR} strokeWidth={1} />
            {isToday && (
              <rect
                x={colX}
                y={headerTop}
                width={WEEK.DAY_WIDTH}
                height={WEEK.HEADER_HEIGHT}
                rx={6}
                fill={Colors.DEEP_DARK}
                fillOpacity={0.5}
              />
            )}
            <text x={centerX} y={headerTop + 27} textAnchor="middle" fontFamily={WEEK.FONT} fill={Colors.WHITE}>
              <tspan fontSize={13} fontWeight={600} fillOpacity={isToday ? 1 : 0.65}>
                {`${formatWeekday(day)} `}
              </tspan>
              <tspan fontSize={16} fontWeight={600} fillOpacity={isToday ? 1 : 0.75}>
                {`${day.getDate()}/${day.getMonth() + 1}`}
              </tspan>
            </text>
          </Fragment>
        );
      })}

      {/* Events */}
      {days.map((day, dayIndex) => {
        const segs = getDaySegments(events, day, colorMap);
        const colX = WEEK.SIDEBAR_WIDTH + dayIndex * WEEK.DAY_WIDTH + 2;
        const colWidth = WEEK.DAY_WIDTH - 4;
        return segs.map((seg, segIndex) => {
          const y = gridTop + seg.startFraction * WEEK.TIMELINE_HEIGHT;
          const height = Math.max(WEEK.MIN_EVENT_HEIGHT, (seg.endFraction - seg.startFraction) * WEEK.TIMELINE_HEIGHT);
          const textColor = getTextColor(seg.color);
          const showName = height >= WEEK.LABEL_MIN_HEIGHT;
          return (
            <Fragment key={`ev${dayIndex}-${segIndex}`}>
              <rect x={colX} y={y} width={colWidth} height={height} fill={seg.color} rx={3} />
              {showName && (
                <text x={colX + 12} y={y + 20} fontSize={16} fontWeight={600} fill={textColor} fontFamily={WEEK.FONT}>
                  {truncateLabel(seg.label, colWidth - 22, 16)}
                </text>
              )}
            </Fragment>
          );
        });
      })}

      {/* Current time marker */}
      {todayIndex >= 0 && (
        <g>
          <circle cx={WEEK.SIDEBAR_WIDTH + todayIndex * WEEK.DAY_WIDTH + 4} cy={markerY} r={3} fill={Colors.WHITE} />
          <line
            x1={WEEK.SIDEBAR_WIDTH + todayIndex * WEEK.DAY_WIDTH + 4}
            y1={markerY}
            x2={WEEK.SIDEBAR_WIDTH + (todayIndex + 1) * WEEK.DAY_WIDTH - 2}
            y2={markerY}
            stroke={Colors.WHITE}
            strokeWidth={4}
            opacity={0.85}
          />
        </g>
      )}

      {/* On-call pill — banner row above table */}
      {onCallName && onCallColor && (
        <OnCallPill cy={Math.round(bannerHeight / 2)} name={onCallName} color={onCallColor} />
      )}
    </svg>
  );
}

export function buildWeekViewSvg(props: WeekViewProps): string {
  return renderToStaticMarkup(<WeekViewSvg {...props} />);
}
