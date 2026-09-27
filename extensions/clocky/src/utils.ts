import { Session, Pause } from "./types";

export function isoNow() {
  return new Date().toISOString();
}

export function newSessionId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function msBetween(aIso: string, bIso: string): number {
  return new Date(bIso).getTime() - new Date(aIso).getTime();
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function sumPauses(pauses: Pause[] | undefined, nowIso?: string) {
  if (!pauses || pauses.length === 0) return 0;
  return pauses.reduce((acc, p) => {
    const start = new Date(p.start).getTime();
    const end = p.end ? new Date(p.end).getTime() : nowIso ? new Date(nowIso).getTime() : Date.now();
    return acc + Math.max(0, end - start);
  }, 0);
}

export function getWorkAndBreak(session: Session, nowIso?: string) {
  const start = session.start;
  const end = session.end ?? nowIso;
  const totalWork = end ? msBetween(start, end) : msBetween(start, new Date().toISOString());
  const breaks = sumPauses(session.pauses, nowIso);
  const net = Math.max(0, totalWork - breaks);
  return { totalWork, breaks, net };
}

export function msToClock(ms: number) {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function formatDelta(ms: number) {
  const sign = ms >= 0 ? "+" : "-";
  return `${sign}${msToClock(Math.abs(ms))}`;
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatTimeAt(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function getEstimatedWorkEnd(now: Date, netMs: number, targetMs: number, isVacation = false) {
  if (isVacation || targetMs <= 0) return null;
  return new Date(now.getTime() + Math.max(0, targetMs - netMs));
}

export function formatDayLabel(date: Date) {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "2-digit" });
}

export function startOfDayIso(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function dayKeyFromIso(iso: string) {
  return dayKey(new Date(iso));
}

export function startOfWeek(date = new Date(), weekStartsOn = 1) {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  start.setDate(start.getDate() - diff);
  return start;
}

export function endOfWeek(date = new Date(), weekStartsOn = 1) {
  const start = startOfWeek(date, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return endOfDay(end);
}

export function eachDayOfInterval(start: Date, end: Date) {
  const days: Date[] = [];
  const current = startOfDay(start);
  const endDay = startOfDay(end);
  while (current.getTime() <= endDay.getTime()) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function overlapMs(startA: Date, endA: Date, startB: Date, endB: Date) {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  return Math.max(0, end - start);
}

export function getActiveSession(sessions: Session[]) {
  return sessions.find((session) => !session.end);
}

export function isSessionPaused(session: Session) {
  return session.pauses?.some((pause) => !pause.end) ?? false;
}

export type SessionSlice = {
  session: Session;
  totalWork: number;
  breaks: number;
  net: number;
};

export function getSessionWorkWithinRange(session: Session, rangeStart: Date, rangeEnd: Date, nowIso?: string) {
  const sessionStart = new Date(session.start);
  const sessionEnd = new Date(session.end ?? nowIso ?? new Date().toISOString());
  const totalWork = overlapMs(sessionStart, sessionEnd, rangeStart, rangeEnd);
  const breaks = sumPausesWithinRange(session.pauses, rangeStart, rangeEnd, nowIso);
  const net = Math.max(0, totalWork - breaks);
  return { totalWork, breaks, net };
}

export function getSessionSlicesForDay(sessions: Session[], day = new Date(), nowIso?: string): SessionSlice[] {
  const rangeStart = startOfDay(day);
  const rangeEnd = endOfDay(day);
  return sessions
    .map((session) => ({ session, ...getSessionWorkWithinRange(session, rangeStart, rangeEnd, nowIso) }))
    .filter((slice) => slice.totalWork > 0 || slice.breaks > 0);
}

export function getDaySummary(sessions: Session[], day = new Date(), nowIso?: string) {
  const slices = getSessionSlicesForDay(sessions, day, nowIso);
  const totals = slices.reduce(
    (acc, slice) => ({
      work: acc.work + slice.totalWork,
      breaks: acc.breaks + slice.breaks,
      net: acc.net + slice.net,
    }),
    { work: 0, breaks: 0, net: 0 },
  );
  return { slices, totals };
}

function sumPausesWithinRange(pauses: Pause[] | undefined, rangeStart: Date, rangeEnd: Date, nowIso?: string) {
  if (!pauses || pauses.length === 0) return 0;
  return pauses.reduce((acc, pause) => {
    const pauseStart = new Date(pause.start);
    const pauseEnd = new Date(pause.end ?? nowIso ?? new Date().toISOString());
    return acc + overlapMs(pauseStart, pauseEnd, rangeStart, rangeEnd);
  }, 0);
}

export function sameDay(aIso: string, b = new Date()) {
  const a = new Date(aIso);
  return a.toDateString() === b.toDateString();
}

export function normalizeWorkDays(value: number): number {
  return Math.min(7, Math.max(1, Math.floor(value)));
}

export function getVisibleWeekDays(weekStart: Date, workDaysPerWeek: number): Date[] {
  const rawCount = Number.isFinite(workDaysPerWeek) ? workDaysPerWeek : 7;
  const count = normalizeWorkDays(rawCount);
  const start = startOfDay(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return eachDayOfInterval(start, end).slice(0, count);
}

export function hasAnotherOpenSession(sessions: Session[], excludeId?: string): boolean {
  return sessions.some((session) => session.id !== excludeId && !session.end);
}

export function hasOverlappingSession(
  sessions: Session[],
  candidateStart: Date,
  candidateEnd: Date | null,
  excludeId?: string,
  nowIso?: string,
): boolean {
  return sessions.some((session) => {
    if (session.id === excludeId) return false;
    return rangesOverlap(
      candidateStart,
      candidateEnd,
      new Date(session.start),
      session.end ? new Date(session.end) : null,
      nowIso,
    );
  });
}

export function isPauseWithinSession(
  sessionStart: Date,
  sessionEnd: Date | null,
  pauseStart: Date,
  pauseEnd: Date | null,
): boolean {
  if (pauseStart.getTime() < sessionStart.getTime()) return false;
  if (sessionEnd) {
    if (pauseStart.getTime() > sessionEnd.getTime()) return false;
    if (!pauseEnd || pauseEnd.getTime() > sessionEnd.getTime()) return false;
  }
  return true;
}

export function allPausesWithinSession(
  pauses: Pause[] | undefined,
  sessionStart: Date,
  sessionEnd: Date | null,
): boolean {
  if (!pauses || pauses.length === 0) return true;
  return pauses.every((pause) =>
    isPauseWithinSession(sessionStart, sessionEnd, new Date(pause.start), pause.end ? new Date(pause.end) : null),
  );
}

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null, nowIso?: string): boolean {
  const now = nowIso ? new Date(nowIso) : new Date();
  return overlapMs(aStart, aEnd ?? now, bStart, bEnd ?? now) > 0;
}

export function detectTickGapMs(lastTickIso: string, nowIso: string): number {
  return msBetween(lastTickIso, nowIso);
}

export type ForgotClockOutSuggestion = {
  shouldFlag: boolean;
  suggestedEndIso: string;
};

export function getForgotClockOutSuggestion(
  activeSession: Session | undefined,
  lastTickIso: string,
  nowIso: string,
  thresholdMs: number,
): ForgotClockOutSuggestion | null {
  if (!activeSession) return null;
  const gapMs = detectTickGapMs(lastTickIso, nowIso);
  const startedBeforeGap = new Date(activeSession.start).getTime() <= new Date(lastTickIso).getTime();
  const shouldFlag = startedBeforeGap && gapMs >= thresholdMs;
  return { shouldFlag, suggestedEndIso: lastTickIso };
}

export type ForgotClockInSuggestion = {
  shouldFlag: boolean;
};

export function getForgotClockInSuggestion(
  activeSession: Session | undefined,
  awakeSinceIso: string,
  nowIso: string,
  thresholdMs: number,
): ForgotClockInSuggestion | null {
  if (activeSession) return null;
  const awakeMs = msBetween(awakeSinceIso, nowIso);
  return { shouldFlag: awakeMs >= thresholdMs };
}

export function closeSessionAt(session: Session, endIso: string) {
  session.end = endIso;
  for (const pause of session.pauses ?? []) {
    if (!pause.end) pause.end = endIso;
  }
}

export function isStatusCommandStale(
  lastSeenIso: string | undefined,
  nowIso: string,
  staleAfterMs = 5 * 60 * 1000,
): boolean {
  if (!lastSeenIso) return true;
  return msBetween(lastSeenIso, nowIso) >= staleAfterMs;
}

export function hasOverlappingPause(
  pauses: Pause[],
  candidateStart: Date,
  candidateEnd: Date | null,
  excludeIndex?: number,
  nowIso?: string,
): boolean {
  return pauses.some((pause, index) => {
    if (index === excludeIndex) return false;
    return rangesOverlap(
      candidateStart,
      candidateEnd,
      new Date(pause.start),
      pause.end ? new Date(pause.end) : null,
      nowIso,
    );
  });
}
