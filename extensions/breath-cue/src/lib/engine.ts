// Pure decision engine: no Raycast imports, so it runs under plain `node --test`.

export type Category = "focus" | "comms" | "browse" | "meeting" | "leisure" | "other";
export type Reason = "post-call" | "long-focus" | "scattered" | "manual";
export type StatusKind = "paused" | "call" | "away" | "focus" | "scattered" | "comms" | "browse" | "leisure" | "active";

export interface Sample {
  app: string;
  bundleId: string;
  idleSeconds: number;
  micInUse: boolean;
  screenLocked: boolean;
  overlayRunning: boolean;
}

export interface Outcome {
  reason: string;
  completed: boolean;
  shownSeconds: number;
  endedAt: number;
}

export interface CueRecord {
  at: number;
  reason: Reason;
  outcome?: "done" | "skipped";
}

export interface State {
  v: 1;
  day: string;
  lastTickAt: number;
  lastBundleId: string;
  lastApp: string;
  recent: { t: number; b: string }[];
  presenceStart: number | null;
  focusStart: number | null;
  lastFocusAt: number | null;
  callStart: number | null;
  micOffAt: number | null;
  lastCall: { endedAt: number; minutes: number } | null;
  postCallPending: boolean;
  minutes: Record<Category, number>;
  cues: CueRecord[];
  lastCueAt: number | null;
  cooldownMin: number;
  focusThresholdMin: number;
  skipStreak: Record<Reason, number>;
  pausedUntil: number | null;
  lastOutcomeAt: number;
}

export interface Status {
  kind: StatusKind;
  title: string;
  detail: string;
  next: string;
}

export interface TickResult {
  state: State;
  cue: Reason | null;
  status: Status;
}

// Tunables. Deliberately not exposed as preferences: the extension adapts them itself.
export const PRESENT_IDLE_SEC = 120;
export const AWAY_IDLE_SEC = 300;
export const FOCUS_GRACE_MIN = 3;
export const MIN_CALL_MIN = 10;
export const POST_CALL_WINDOW_MIN = 6;
export const MAX_CUES_PER_DAY = 10;
export const SCATTER_WINDOW = 10;
export const SCATTER_CHANGES = 6;
export const SCATTER_APPS = 4;
export const FORCE_EXTRA_MIN = 40;
export const QUIET_START_HOUR = 23;
export const QUIET_END_HOUR = 7;

const MINUTE = 60_000;

export function emptyState(now: number): State {
  return {
    v: 1,
    day: dayKey(now),
    lastTickAt: 0,
    lastBundleId: "",
    lastApp: "",
    recent: [],
    presenceStart: null,
    focusStart: null,
    lastFocusAt: null,
    callStart: null,
    micOffAt: null,
    lastCall: null,
    postCallPending: false,
    minutes: { focus: 0, comms: 0, browse: 0, meeting: 0, leisure: 0, other: 0 },
    cues: [],
    lastCueAt: null,
    cooldownMin: 45,
    focusThresholdMin: 50,
    skipStreak: { "post-call": 0, "long-focus": 0, scattered: 0, manual: 0 },
    pausedUntil: null,
    lastOutcomeAt: 0,
  };
}

export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------------------------
// App categories

const FOCUS = [
  "com.microsoft.VSCode",
  "com.todesktop.230313mzl4w4u92", // Cursor
  "com.exafunction.windsurf",
  "dev.zed.Zed",
  "com.apple.dt.Xcode",
  "com.jetbrains.",
  "com.google.android.studio",
  "com.sublimetext.",
  "com.panic.Nova",
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "dev.warp.Warp",
  "com.mitchellh.ghostty",
  "net.kovidgoyal.kitty",
  "io.alacritty",
  "com.stablyai.orca",
  "com.figma.Desktop",
  "com.bohemiancoding.sketch3",
  "com.framer.",
  "com.adobe.",
  "com.seriflabs.",
  "com.pixelmatorteam.",
  "md.obsidian",
  "notion.id",
  "com.apple.Notes",
  "com.apple.iWork.",
  "com.microsoft.Word",
  "com.microsoft.Excel",
  "com.microsoft.Powerpoint",
  "abnerworks.Typora",
  "com.ulyssesapp.mac",
  "pro.writer.mac",
  "com.literatureandlatte.",
  "net.shinyfrog.bear",
  "com.linear",
  "com.ableton.live",
  "com.apple.logic10",
  "com.apple.FinalCut",
  "com.blackmagic-design.",
  "com.anthropic.claudefordesktop",
  "com.openai.chat",
  "com.openai.codex",
  "com.tableplus.TablePlus",
  "com.postmanlabs.mac",
  "com.apple.Preview",
];

const COMMS = [
  "com.tinyspeck.slackmacgap",
  "ru.keepcoder.Telegram",
  "com.tdesktop.Telegram",
  "net.whatsapp.WhatsApp",
  "desktop.WhatsApp",
  "com.apple.mail",
  "com.apple.MobileSMS",
  "com.microsoft.Outlook",
  "com.hnc.Discord",
  "com.readdle.smartemail-Mac",
  "com.superhuman.",
  "com.microsoft.teams",
  "com.facebook.archon",
  "org.whispersystems.signal-desktop",
  "com.apple.iCal",
  "com.flexibits.fantastical",
  "com.cron.electron",
];

const MEETING = ["us.zoom.xos", "com.apple.FaceTime", "com.cisco.webexmeetingsapp", "Cisco-Systems.Spark"];

const BROWSE = [
  "com.google.Chrome",
  "com.apple.Safari",
  "company.thebrowser.",
  "org.mozilla.firefox",
  "com.brave.Browser",
  "com.microsoft.edgemac",
  "com.vivaldi.Vivaldi",
  "app.zen-browser.zen",
  "com.operasoftware.Opera",
  "ai.perplexity.comet",
  "com.openai.atlas",
  "com.kagi.kagimacOS",
];

const LEISURE = [
  "com.spotify.client",
  "com.apple.Music",
  "com.apple.TV",
  "com.apple.podcasts",
  "com.valvesoftware.steam",
  "com.apple.Photos",
  "com.colliderli.iina",
  "org.videolan.vlc",
];

/** Never interrupt while these are frontmost: video, presentations, recording, games. */
const DO_NOT_DISTURB = [
  "com.apple.QuickTimePlayerX",
  "com.colliderli.iina",
  "org.videolan.vlc",
  "com.apple.TV",
  "com.obsproject.obs-studio",
  "com.apple.ScreenSharing",
  "com.valvesoftware.steam",
  "com.apple.iWork.Keynote",
  "com.microsoft.Powerpoint",
  "com.apple.PhotoBooth",
  "us.zoom.xos",
  "com.apple.FaceTime",
];

function matches(list: string[], bundleId: string): boolean {
  return list.some((p) => (p.endsWith(".") ? bundleId.startsWith(p) : bundleId === p || bundleId.startsWith(p)));
}

export function categorize(bundleId: string): Category {
  if (!bundleId) return "other";
  if (matches(MEETING, bundleId)) return "meeting";
  if (matches(FOCUS, bundleId)) return "focus";
  if (matches(COMMS, bundleId)) return "comms";
  if (matches(BROWSE, bundleId)) return "browse";
  if (matches(LEISURE, bundleId)) return "leisure";
  return "other";
}

export function isDoNotDisturb(bundleId: string): boolean {
  return matches(DO_NOT_DISTURB, bundleId);
}

// ---------------------------------------------------------------------------------------------
// Outcomes: the extension learns from how its cues are received.

export function applyOutcome(prev: State, outcome: Outcome): State {
  if (outcome.endedAt <= prev.lastOutcomeAt) return prev;
  const s: State = structuredClone(prev);
  s.lastOutcomeAt = outcome.endedAt;
  const reason = (["post-call", "long-focus", "scattered", "manual"] as Reason[]).includes(outcome.reason as Reason)
    ? (outcome.reason as Reason)
    : "manual";
  const done = outcome.completed;

  for (let i = s.cues.length - 1; i >= 0; i--) {
    if (s.cues[i].reason === reason && !s.cues[i].outcome) {
      s.cues[i].outcome = done ? "done" : "skipped";
      break;
    }
  }
  if (reason === "manual") return s;

  if (done) {
    s.cooldownMin = Math.max(30, Math.round(s.cooldownMin * 0.9));
    s.skipStreak[reason] = 0;
  } else {
    s.cooldownMin = Math.min(150, Math.round(s.cooldownMin * 1.4));
    s.skipStreak[reason] += 1;
    if (reason === "long-focus") s.focusThresholdMin = Math.min(120, s.focusThresholdMin + 15);
  }
  return s;
}

// ---------------------------------------------------------------------------------------------
// Tick

export function tick(prev: State, sample: Sample, now: number): TickResult {
  const s: State = structuredClone(prev);
  const gapMs = s.lastTickAt ? now - s.lastTickAt : 0;
  const resumedFromSleep = gapMs > 10 * MINUTE;

  if (s.day !== dayKey(now)) {
    s.day = dayKey(now);
    s.minutes = { focus: 0, comms: 0, browse: 0, meeting: 0, leisure: 0, other: 0 };
    s.cues = [];
    s.skipStreak = { "post-call": 0, "long-focus": 0, scattered: 0, manual: 0 };
  }
  if (s.pausedUntil && now >= s.pausedUntil) s.pausedUntil = null;

  const away = sample.screenLocked || sample.idleSeconds >= AWAY_IDLE_SEC || resumedFromSleep;
  const present = !sample.screenLocked && sample.idleSeconds < PRESENT_IDLE_SEC;
  const appChanged = !!s.lastBundleId && sample.bundleId !== s.lastBundleId;
  const category: Category = sample.micInUse ? "meeting" : categorize(sample.bundleId);

  // Calls: the microphone being captured by anything is the signal. A call ends after the mic
  // has been off for two consecutive samples, so brief mutes or device switches don't end it.
  if (sample.micInUse) {
    s.callStart ??= now;
    s.micOffAt = null;
  } else if (s.callStart !== null) {
    s.micOffAt ??= now;
    if (now - s.micOffAt >= 50_000 || resumedFromSleep) {
      const minutes = Math.round((s.micOffAt - s.callStart) / MINUTE);
      if (minutes >= MIN_CALL_MIN) {
        s.lastCall = { endedAt: s.micOffAt, minutes };
        s.postCallPending = true;
      }
      s.callStart = null;
      s.micOffAt = null;
    }
  }

  // Presence and focus streaks. A 5-minute step away counts as a real break.
  if (away) {
    s.presenceStart = null;
    s.focusStart = null;
    s.lastFocusAt = null;
  } else {
    s.presenceStart ??= now;
    if (category === "focus" && present) {
      s.focusStart ??= now;
      s.lastFocusAt = now;
    } else if (s.lastFocusAt !== null && now - s.lastFocusAt > FOCUS_GRACE_MIN * MINUTE) {
      s.focusStart = null;
      s.lastFocusAt = null;
    }
  }

  if (present && gapMs > 0) {
    s.minutes[category] += Math.min(gapMs, 5 * MINUTE) / MINUTE;
  }

  if (present && sample.bundleId) {
    s.recent.push({ t: now, b: sample.bundleId });
    s.recent = s.recent.filter((r) => now - r.t <= 15 * MINUTE).slice(-SCATTER_WINDOW);
  }
  s.lastBundleId = sample.bundleId;
  s.lastApp = sample.app;
  s.lastTickAt = now;

  const focusMin = s.focusStart !== null ? Math.round((now - s.focusStart) / MINUTE) : 0;
  const presenceMin = s.presenceStart !== null ? Math.round((now - s.presenceStart) / MINUTE) : 0;
  const scattered = isScattered(s.recent);

  // ---- decide whether to cue -------------------------------------------------------------
  let cue: Reason | null = null;
  const hour = new Date(now).getHours();
  const quietHours = hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
  const canInterrupt =
    !s.pausedUntil &&
    present &&
    !sample.micInUse &&
    !sample.overlayRunning &&
    !resumedFromSleep &&
    !quietHours &&
    !isDoNotDisturb(sample.bundleId) &&
    s.cues.length < MAX_CUES_PER_DAY;
  const sinceCueMin = s.lastCueAt === null ? Infinity : (now - s.lastCueAt) / MINUTE;

  if (s.postCallPending && s.lastCall && now - s.lastCall.endedAt > POST_CALL_WINDOW_MIN * MINUTE) {
    s.postCallPending = false;
  }

  if (canInterrupt) {
    const naturalPause = appChanged || (sample.idleSeconds >= 15 && sample.idleSeconds < PRESENT_IDLE_SEC);
    const longStreak = Math.max(focusMin, Math.round(presenceMin * 0.75));
    if (s.postCallPending && s.skipStreak["post-call"] < 3 && sinceCueMin >= 20) {
      cue = "post-call";
    } else if (
      sinceCueMin >= s.cooldownMin &&
      s.skipStreak["long-focus"] < 3 &&
      ((longStreak >= s.focusThresholdMin && naturalPause) || longStreak >= s.focusThresholdMin + FORCE_EXTRA_MIN)
    ) {
      cue = "long-focus";
    } else if (sinceCueMin >= s.cooldownMin && s.skipStreak.scattered < 3 && scattered && presenceMin >= 15) {
      cue = "scattered";
    }
  }

  if (cue) {
    s.postCallPending = false;
    s.lastCueAt = now;
    s.cues.push({ at: now, reason: cue });
    if (cue === "long-focus") {
      // A cue is a break: start counting the next stretch from here.
      s.focusStart = now;
      s.presenceStart = now;
    }
  }

  return {
    state: s,
    cue,
    status: describe(s, sample, { away, present, focusMin, presenceMin, scattered, category }, now),
  };
}

export function isScattered(recent: { t: number; b: string }[]): boolean {
  if (recent.length < SCATTER_WINDOW - 2) return false;
  let changes = 0;
  for (let i = 1; i < recent.length; i++) if (recent[i].b !== recent[i - 1].b) changes++;
  const apps = new Set(recent.map((r) => r.b)).size;
  return changes >= SCATTER_CHANGES && apps >= SCATTER_APPS;
}

// ---------------------------------------------------------------------------------------------
// Human-readable status

export function formatMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function describe(
  s: State,
  sample: Sample,
  x: { away: boolean; present: boolean; focusMin: number; presenceMin: number; scattered: boolean; category: Category },
  now: number,
): Status {
  const app = sample.app || "an app";
  const next = nextHint(s, x.focusMin, x.presenceMin, now);

  if (s.pausedUntil) {
    const until = new Date(s.pausedUntil);
    return {
      kind: "paused",
      title: "Paused",
      detail: `Cues paused until ${until.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
      next: "No cues while paused",
    };
  }
  if (sample.micInUse) {
    const m = s.callStart ? (now - s.callStart) / MINUTE : 0;
    return {
      kind: "call",
      title: `Call ${formatMinutes(m)}`,
      detail: `On a call for ${formatMinutes(m)}`,
      next: "A short reset right after the call ends",
    };
  }
  if (x.away) return { kind: "away", title: "Away", detail: "Stepped away — streaks reset", next };
  if (x.scattered) return { kind: "scattered", title: "Scattered", detail: "Switching between many apps", next };
  switch (x.category) {
    case "focus":
      return {
        kind: "focus",
        title: `Focus ${formatMinutes(x.focusMin)}`,
        detail: `Deep work in ${app} for ${formatMinutes(x.focusMin)}`,
        next,
      };
    case "comms":
      return { kind: "comms", title: "Messaging", detail: `Messaging in ${app}`, next };
    case "browse":
      return { kind: "browse", title: "Browsing", detail: `In ${app}`, next };
    case "leisure":
      return { kind: "leisure", title: "Break", detail: `Taking it easy in ${app}`, next };
    default:
      return {
        kind: "active",
        title: `Active ${formatMinutes(x.presenceMin)}`,
        detail: `At the keyboard for ${formatMinutes(x.presenceMin)} · ${app}`,
        next,
      };
  }
}

function nextHint(s: State, focusMin: number, presenceMin: number, now: number): string {
  if (s.cues.length >= MAX_CUES_PER_DAY) return "Daily limit reached — no more cues today";
  const hour = new Date(now).getHours();
  if (hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR) return "Quiet hours — no cues until 7:00";
  const streak = Math.max(focusMin, Math.round(presenceMin * 0.75));
  const sinceCue = s.lastCueAt === null ? Infinity : (now - s.lastCueAt) / MINUTE;
  const byCooldown = Number.isFinite(sinceCue) ? Math.max(0, s.cooldownMin - sinceCue) : 0;
  const byFocus = Math.max(0, s.focusThresholdMin - streak);
  const wait = Math.max(byCooldown, byFocus);
  if (wait <= 0) return "Next breath at your next natural pause";
  return `Next breath in ~${formatMinutes(wait)}, at a natural pause`;
}
