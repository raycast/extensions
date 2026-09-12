import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Icon,
  Keyboard,
  LocalStorage,
  Toast,
  openCommandPreferences,
  showToast,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { buildLevel, levelBriefing, type Rank } from "./maze/level";
import { renderMazeSvg } from "./maze/render";
import { cutPathAtGhost, iceExplore, SHIFT_EVERY, shiftWalls, slidePath, stepGuard } from "./maze/rules";
import {
  ptKey,
  samePoint,
  type CustomSetup,
  type Direction,
  type LevelState,
  type Pickup,
  type Point,
} from "./maze/types";

const GEM_POINTS = 25;
const KEY_POINTS = 50;
const CANDLE_POINTS = 30;
const CAUGHT_PENALTY = 15;
const LEVEL_BONUS = 100;
const INTRO_MS = 1800;
const STEP_MS = 180;
const FAST_STEP_MS = 70;
const HELD_KEY_GAP_MS = 260;
const CATCH_ANIM_MS = 780;

/** Human-readable movement shortcut for the current OS (matches `moveShortcut`). */
const MOVE_KEYS_LABEL = process.platform === "win32" ? "Ctrl + Arrow Keys" : "⌘ + Arrow Keys";

/** Theme-aware sidebar colors (Raycast adapts these to light/dark appearance). */
const RANK_COLOR: Record<Rank, Color> = {
  CHAOS: Color.Red,
  NIGHTMARE: Color.Red,
  PERILOUS: Color.Orange,
  RISING: Color.Yellow,
  ADVENTURE: Color.Green,
  TRAINING: Color.Blue,
};

function moveShortcut(key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return { macOS: { modifiers: ["cmd"], key }, Windows: { modifiers: ["ctrl"], key } };
}

/** Fire-and-forget a promise without leaving an unhandled rejection behind. */
function fireAndForget(promise: Promise<unknown>, what: string): void {
  promise.catch((error: unknown) => console.error(`[labyrinth] ${what} failed`, error));
}

function toast(options: Toast.Options): void {
  fireAndForget(showToast(options), "showToast");
}

/** Tell the player when the generator could not honour a requested hazard. */
function announceFallbacks(level: LevelState): void {
  if (level.iceFallback) {
    toast({
      style: Toast.Style.Failure,
      title: "No icy layout could be built 🧊",
      message: `Level ${level.level} is playing without ice this time`,
    });
  }
}

function buildAndAnnounce(level: number, custom?: CustomSetup): LevelState {
  const built = buildLevel(level, custom);
  announceFallbacks(built);
  return built;
}

/** Coerce a persisted number back into a safe integer within [min, max]. */
function savedInt(value: unknown, fallback: number, min: number, max = Number.MAX_SAFE_INTEGER): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function alongPath(path: Point[], t: number): Point {
  if (path.length === 0) return { x: 0, y: 0 };
  if (path.length === 1 || t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const weights: number[] = [];
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const d = Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
    const w = d > 1.5 ? 0.12 : Math.max(d, 0.15);
    weights.push(w);
    total += w;
  }
  let acc = t * total;
  for (let i = 0; i < weights.length; i++) {
    if (acc <= weights[i]) {
      const u = acc / weights[i];
      const a = path[i];
      const b = path[i + 1];
      if (Math.hypot(b.x - a.x, b.y - a.y) > 1.5) return u < 0.5 ? a : b;
      return lerpPoint(a, b, u);
    }
    acc -= weights[i];
  }
  return path[path.length - 1];
}

function trailAfterLeaving(base: Map<string, number>, path: Point[], t: number, move: number): Map<string, number> {
  const next = new Map(base);
  if (path.length < 2) return next;
  const seg = t * (path.length - 1);
  for (let i = 0; i < path.length - 1; i++) {
    if (seg > i + 0.28) next.set(ptKey(path[i]), move);
  }
  return next;
}

function lingeringPickups(pickups: Pickup[], path: Point[], t: number): Pickup[] {
  if (pickups.length === 0 || path.length === 0) return [];
  const seg = t * (path.length - 1);
  return pickups.filter((item) => {
    const idx = path.findIndex((p) => samePoint(p, item.at));
    return idx >= 0 && seg < idx + 0.12;
  });
}

type MoveAnim = {
  playerPath: Point[];
  guardFrom: Point | null;
  guardTo: Point | null;
  startedAt: number;
  duration: number;
  pickups: Pickup[];
};

type CatchAnim = {
  at: Point;
  startedAt: number;
  duration: number;
};

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function MazeCommand({ custom }: { custom?: CustomSetup } = {}) {
  const homeLevel = custom?.level ?? 1;
  const isCustom = custom !== undefined;
  const store = (name: string) => (isCustom ? `labyrinth-custom-${name}` : `labyrinth-${name}`);
  const [game, setGame] = useState<LevelState>(() => buildLevel(homeLevel, custom));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState({ level: 0, score: 0 });
  const [showSidebar, setShowSidebar] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [anim, setAnim] = useState<MoveAnim | null>(null);
  const [catchAnim, setCatchAnim] = useState<CatchAnim | null>(null);
  const [introing, setIntroing] = useState(true);
  const [introStartedAt, setIntroStartedAt] = useState<number | null>(null);
  const [booted, setBooted] = useState(false);
  const [, setFrame] = useState(0);
  const queuedMove = useRef<Direction | null>(null);
  const pendingCatch = useRef<Point | null>(null);
  const lastMoveAt = useRef(0);
  /** Score when the current level began; "Restart Level" rolls back to it. */
  const levelStartScore = useRef(0);

  const won = game.finishedAt !== null;
  const lighting = game.lightBurst > 0 && game.lightBurst < 1;
  const moving = anim !== null;
  const catching = catchAnim !== null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bestLevel, bestScore, runLevel, runScore, sidebar] = await Promise.all([
          LocalStorage.getItem<number>(store("best-level")),
          LocalStorage.getItem<number>(store("best-score")),
          LocalStorage.getItem<number>(store("run-level")),
          LocalStorage.getItem<number>(store("run-score")),
          LocalStorage.getItem<string>("labyrinth-sidebar"),
        ]);
        if (cancelled) return;
        if (bestLevel !== undefined || bestScore !== undefined) {
          setBest({ level: savedInt(bestLevel, 0, 0), score: savedInt(bestScore, 0, 0) });
        }
        if (sidebar === "hidden") setShowSidebar(false);
        const savedLevel = savedInt(runLevel, 1, 1);
        const savedScore = savedInt(runScore, 0, 0);
        const resuming = !isCustom && (savedLevel > 1 || savedScore > 0);
        if (resuming) {
          setGame(buildAndAnnounce(savedLevel));
          setScore(savedScore);
          levelStartScore.current = savedScore;
          setNow(Date.now());
          setIntroing(true);
          toast({ style: Toast.Style.Success, title: `Welcome back! Resuming at Level ${savedLevel}` });
        } else {
          // The initial level was built in the useState initializer, which must stay side-effect free.
          announceFallbacks(game);
        }
      } catch (error) {
        // Storage is best-effort: start a fresh run rather than failing to render.
        console.error("[labyrinth] failed to load saved progress", error);
      } finally {
        if (!cancelled) {
          setIntroStartedAt(Date.now());
          setBooted(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Runs once per mount; `store` only depends on `isCustom`, which is fixed per command.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustom]);

  function saveRun(level: number, runScore: number) {
    if (isCustom) return;
    fireAndForget(LocalStorage.setItem(store("run-level"), level), "save run level");
    fireAndForget(LocalStorage.setItem(store("run-score"), runScore), "save run score");
  }

  useEffect(() => {
    if (won || introing) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [won, introing, game.startedAt]);

  function dismissIntro() {
    setIntroing(false);
    queuedMove.current = null;
    setGame((g) => ({ ...g, startedAt: Date.now() }));
    setNow(Date.now());
  }

  const introPlaying = introing && introStartedAt != null && Date.now() - introStartedAt < INTRO_MS;

  /** Called once when a move animation has played out: commit the trail and start any pending catch. */
  function finishMove(finished: MoveAnim) {
    const leftBehind = finished.playerPath.slice(0, -1);
    setGame((g) => {
      const nextTrail = new Map(g.trail);
      for (const p of leftBehind) nextTrail.set(ptKey(p), g.moves);
      return { ...g, trail: nextTrail };
    });
    setAnim(null);
    const hit = pendingCatch.current;
    if (hit) {
      pendingCatch.current = null;
      setCatchAnim({ at: hit, startedAt: Date.now(), duration: CATCH_ANIM_MS });
      toast({
        style: Toast.Style.Failure,
        title: "The ghost caught you! 👻",
        message: `Back to the start (-${CAUGHT_PENALTY} pts)`,
      });
    }
  }

  /** Called once when the catch animation has played out: send player and ghost home. */
  function finishCatch() {
    setGame((g) => ({
      ...g,
      player: { ...g.start },
      guard: g.guardHome ? { ...g.guardHome } : null,
    }));
    setCatchAnim(null);
  }

  useEffect(() => {
    if (!lighting && !moving && !catching && !introPlaying) return;
    const timer = setInterval(() => {
      const t = Date.now();
      if (lighting) {
        setGame((g) => {
          if (g.lightBurst <= 0 || g.lightBurst >= 1) return g;
          return { ...g, lightBurst: Math.min(1, g.lightBurst + 0.055) };
        });
      }
      // Side effects live here, not inside state updaters (which must stay pure).
      // Stop this interval after a one-shot transition; the effect re-runs with fresh deps.
      if (anim && t - anim.startedAt >= anim.duration) {
        clearInterval(timer);
        finishMove(anim);
        return;
      }
      if (catchAnim && t - catchAnim.startedAt >= catchAnim.duration) {
        clearInterval(timer);
        finishCatch();
        return;
      }
      setFrame((n) => n + 1);
    }, 32);
    return () => clearInterval(timer);
    // finishMove/finishCatch are stable in behaviour; they only touch setters and refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lighting, anim, catchAnim, introPlaying]);

  // `move` closes over the latest state and is recreated every render; expose the newest
  // version through a ref so the queued-move effect can call it without re-subscribing.
  const moveRef = useRef<(direction: Direction) => void>(() => {});
  moveRef.current = move;

  useEffect(() => {
    if (moving || lighting || catching || won || introing) return;
    const next = queuedMove.current;
    if (!next) return;
    queuedMove.current = null;
    moveRef.current(next);
  }, [moving, lighting, catching, won, introing]);

  function saveBest(clearedLevel: number, runScore: number) {
    const nextBest = { level: Math.max(best.level, clearedLevel), score: Math.max(best.score, runScore) };
    if (nextBest.level !== best.level || nextBest.score !== best.score) {
      setBest(nextBest);
      fireAndForget(LocalStorage.setItem(store("best-level"), nextBest.level), "save best level");
      fireAndForget(LocalStorage.setItem(store("best-score"), nextBest.score), "save best score");
    }
  }

  function move(direction: Direction) {
    if (game.finishedAt || introing) return;
    if (lighting || catching) return;
    if (moving) {
      queuedMove.current = direction;
      return;
    }
    const doorLocked = game.needsKey && !game.hasKey;
    const slide = slidePath(game.maze, game.player, direction, game.ice, game.portals, game.exit, doorLocked);
    if (slide.cells.length === 0) {
      if (slide.blockedByDoor) {
        toast({ style: Toast.Style.Failure, title: "The door is locked 🔒", message: "Find the golden key first" });
      }
      return;
    }

    let { key, hasKey, gems, guard, candle, lit } = game;
    let lightBurst = game.lightBurst;
    let lightOrigin = game.lightOrigin;
    let scoreDelta = 0;
    let finishedAt: number | null = null;
    let notice: Toast.Options | null = null;

    // Sliding into a ghost stops you on its cell, so nothing past it is traversed or collected.
    const path = cutPathAtGhost(slide.cells, guard);
    const warped = slide.warped && path.length === slide.cells.length;
    if (warped) {
      notice = { style: Toast.Style.Success, title: "Whoosh! 🌀", message: "The portal warped you across the maze" };
    }

    let gemsCollected = 0;
    const pickups: Pickup[] = [];
    for (const cell of path) {
      if (key && samePoint(cell, key)) {
        pickups.push({ kind: "key", at: { ...cell } });
        hasKey = true;
        key = null;
        scoreDelta += KEY_POINTS;
        notice = {
          style: Toast.Style.Success,
          title: "You got the key! 🔑",
          message: `The exit is unlocked (+${KEY_POINTS} pts)`,
        };
      }
      if (candle && samePoint(cell, candle)) {
        pickups.push({ kind: "candle", at: { ...cell } });
        candle = null;
        lit = true;
        lightBurst = 0.02;
        lightOrigin = { ...cell };
        scoreDelta += CANDLE_POINTS;
        notice = {
          style: Toast.Style.Success,
          title: "The candle lights the maze! 🕯️",
          message: `The darkness is gone (+${CANDLE_POINTS} pts)`,
        };
      }
      const gemIndex = gems.findIndex((g) => samePoint(g, cell));
      if (gemIndex >= 0) {
        pickups.push({ kind: "gem", at: { ...cell } });
        gems = gems.filter((_, i) => i !== gemIndex);
        gemsCollected++;
      }
    }
    if (gemsCollected > 0) {
      scoreDelta += GEM_POINTS * gemsCollected;
      notice = {
        style: Toast.Style.Success,
        title: `Gem${gemsCollected > 1 ? "s" : ""} collected! 💎 +${GEM_POINTS * gemsCollected} pts`,
      };
    }

    let player = path[path.length - 1];
    if (samePoint(player, game.exit)) {
      finishedAt = Date.now();
      scoreDelta += LEVEL_BONUS * game.level;
    }

    let catches = game.catches;
    if (!finishedAt && guard && game.guardHome) {
      let caught = samePoint(player, guard);
      const guardActs = (game.moves + 1) % 2 === 0;
      if (!caught && guardActs) {
        guard = stepGuard(game.maze, guard, player, game.guardChase);
        caught = samePoint(guard, player);
      }
      if (caught) {
        catches++;
        pendingCatch.current = { ...player };
        scoreDelta -= CAUGHT_PENALTY;
      }
    }

    const newMoves = game.moves + 1;
    let maze = game.maze;
    if (!finishedAt && game.shifting && newMoves % SHIFT_EVERY === 0) {
      const mustReach = [key, candle, ...gems, ...(game.portals ?? []), game.exit].filter(
        (p): p is Point => p !== null,
      );
      const shifted = shiftWalls(game.maze, player, game.start, game.exit, mustReach, game.ice, key, game.portals);
      if (shifted) {
        maze = shifted;
        if (!notice) notice = { style: Toast.Style.Success, title: "The walls are shifting… 🧱" };
      }
    }

    if (
      !finishedAt &&
      !pendingCatch.current &&
      game.ice &&
      !iceExplore(maze, player, game.exit, key, game.portals).solvable
    ) {
      player = { ...game.start };
      notice = {
        style: Toast.Style.Failure,
        title: "The ice boxed you in! 🧊",
        message: "Back to the start — that slide had no way out",
      };
    }

    if (samePoint(player, path[path.length - 1])) {
      const startedAt = Date.now();
      const heldKey = startedAt - lastMoveAt.current < HELD_KEY_GAP_MS;
      lastMoveAt.current = startedAt;
      const stepMs = heldKey ? FAST_STEP_MS : STEP_MS;
      const steps = path.length;
      setAnim({
        playerPath: [game.player, ...path],
        guardFrom: game.guard,
        guardTo: guard,
        startedAt,
        duration: game.ice ? Math.min(stepMs * 2.4, Math.max(stepMs * 0.8, stepMs * 0.4 * steps)) : stepMs,
        pickups,
      });
    }

    setGame({
      ...game,
      maze,
      player,
      key,
      hasKey,
      gems,
      guard,
      candle,
      lit,
      lightBurst,
      lightOrigin,
      moves: newMoves,
      levelPoints: game.levelPoints + scoreDelta,
      catches,
      finishedAt,
    });

    const newScore = Math.max(0, score + scoreDelta);
    if (scoreDelta !== 0) setScore(newScore);

    if (finishedAt) {
      saveBest(game.level, newScore);
      saveRun(game.level + 1, newScore);
      toast({
        style: Toast.Style.Success,
        title: `Level ${game.level} cleared! +${LEVEL_BONUS * game.level} pts`,
        message: "Press ⏎ to descend deeper",
      });
    } else if (notice) {
      toast(notice);
    }
  }

  /** Build `level` and continue the run with `startingScore` (defaults to the current score). */
  function startLevel(level: number, startingScore: number = score) {
    queuedMove.current = null;
    pendingCatch.current = null;
    lastMoveAt.current = 0;
    setCatchAnim(null);
    setAnim(null);
    setGame(buildAndAnnounce(level, custom));
    setIntroing(true);
    setIntroStartedAt(Date.now());
    setScore(startingScore);
    levelStartScore.current = startingScore;
    setNow(Date.now());
    saveRun(level, startingScore);
  }

  /** Replay the current level, giving back the points earned in it so it can't be farmed. */
  function restartLevel() {
    startLevel(game.level, levelStartScore.current);
  }

  function toggleSidebar() {
    const next = !showSidebar;
    setShowSidebar(next);
    fireAndForget(LocalStorage.setItem("labyrinth-sidebar", next ? "shown" : "hidden"), "save sidebar");
  }

  async function resetProgress() {
    const confirmed = await confirmAlert({
      title: "Reset All Progress?",
      message: custom
        ? `This clears sandbox best records and restarts at Level ${homeLevel}.`
        : "This clears your saved run and best records, and restarts from Level 1.",
      primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await Promise.all([LocalStorage.removeItem(store("best-level")), LocalStorage.removeItem(store("best-score"))]);
    } catch (error) {
      console.error("[labyrinth] failed to clear best records", error);
      toast({ style: Toast.Style.Failure, title: "Couldn't clear saved records", message: String(error) });
      return;
    }
    setBest({ level: 0, score: 0 });
    startLevel(homeLevel, 0);
    toast({
      style: Toast.Style.Success,
      title: "Progress reset",
      message: `Starting fresh at Level ${homeLevel}`,
    });
  }

  if (!booted) {
    return <Detail isLoading markdown="" />;
  }

  const catchT = catchAnim ? Math.min(1, (Date.now() - catchAnim.startedAt) / catchAnim.duration) : null;
  const introT = introing ? Math.min(1, (Date.now() - (introStartedAt ?? Date.now())) / INTRO_MS) : null;
  const animT = anim ? easeInOutQuad(Math.min(1, (Date.now() - anim.startedAt) / anim.duration)) : 1;
  const drawPlayer = catchAnim ? catchAnim.at : anim ? alongPath(anim.playerPath, animT) : game.player;
  const drawGuard = catchAnim
    ? catchAnim.at
    : anim && anim.guardFrom && anim.guardTo
      ? lerpPoint(anim.guardFrom, anim.guardTo, animT)
      : game.guard;
  const playerScale =
    catchT == null
      ? 1
      : catchT < 0.4
        ? 1 + (catchT / 0.4) * 1.6
        : catchT < 0.7
          ? 2.6
          : Math.max(0.35, 2.6 - ((catchT - 0.7) / 0.3) * 2.25);
  const guardScale = catchT == null ? 1 : 1 + Math.min(catchT, 0.45) * 0.9;
  const shakeX = catchT != null && catchT > 0.1 && catchT < 0.82 ? Math.sin(catchT * 72) * 7 : 0;
  const drawTrail = anim ? trailAfterLeaving(game.trail, anim.playerPath, animT, game.moves) : game.trail;
  const stillThere = anim ? lingeringPickups(anim.pickups, anim.playerPath, animT) : [];
  const drawGems = [...game.gems, ...stillThere.filter((p) => p.kind === "gem").map((p) => p.at)];
  const drawKey = game.key ?? stillThere.find((p) => p.kind === "key")?.at ?? null;
  const drawCandle = game.candle ?? stillThere.find((p) => p.kind === "candle")?.at ?? null;
  const svg = renderMazeSvg(
    {
      ...game,
      trail: drawTrail,
      gems: drawGems,
      key: drawKey,
      candle: drawCandle,
      hasKey: drawKey ? false : game.hasKey,
    },
    showSidebar ? 500 : 640,
    {
      player: drawPlayer,
      guard: drawGuard,
      playerScale,
      guardScale,
      shakeX,
      catchT: catchT ?? undefined,
      introT: introT ?? undefined,
    },
  );
  const mazeImage = `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
  const elapsed = formatElapsed((game.finishedAt ?? now) - game.startedAt);
  const briefing = levelBriefing(game);

  const objectives: string[] = [];
  if (game.needsKey && !game.hasKey) objectives.push("find the 🔑 to unlock the exit");
  else objectives.push("reach the green exit");
  if (game.gems.length > 0) objectives.push("grab 💎 for points");
  if (game.guard) objectives.push("dodge the 👻");
  if (game.portals) objectives.push("🌀 portals warp you");
  if (game.fogRadius !== null && !game.lit) objectives.push("reach the 🕯️ glow to light the maze");
  if (game.ice) objectives.push("🧊 icy floor — you slide until you hit something");
  if (game.shifting) objectives.push(`🧱 walls shift every ${SHIFT_EVERY} moves`);
  if (game.trailLife === 0) objectives.push("🐾 no footprints — remember your route");
  else if (game.trailLife !== null) objectives.push(`🐾 footprints fade after ${game.trailLife} moves`);

  let statusBlock: string;
  if (won) {
    const gemsCollected = game.gemTotal - game.gems.length;
    const statLines = [
      `- 🚶 Moves: **${game.moves}**`,
      `- ⏱️ Time: **${elapsed}**`,
      `- 💎 Gems: **${gemsCollected}/${game.gemTotal}**`,
    ];
    if (game.guardHome) statLines.push(`- 👻 Caught by the ghost: **${game.catches}×**`);
    statLines.push(
      `- ⭐ Level points: **${game.levelPoints >= 0 ? "+" : ""}${game.levelPoints}**`,
      `- 🏆 Total score: **${score} pts**`,
    );
    statusBlock = `## Level ${game.level} cleared!

${statLines.join("\n")}

Press ⏎ to descend to Level ${game.level + 1}.`;
  } else {
    const hudLine = showSidebar
      ? ""
      : `**${score} pts** · 💎 ${game.gemTotal - game.gems.length}/${game.gemTotal}${game.needsKey ? ` · ${game.hasKey ? "🔑" : "🔒"}` : ""}${game.fogRadius !== null ? ` · ${game.lit ? "🕯️" : "🌑"}` : ""}${game.ice ? " · 🧊" : ""}${game.shifting ? " · 🧱" : ""}${game.trailLife !== null ? " · 🐾" : ""} · ${game.moves} moves\n\n`;
    statusBlock = `${hudLine}## Level ${game.level}

Move with **${MOVE_KEYS_LABEL}** — ${objectives.join(" · ")}`;
  }

  const markdown = introing
    ? `![Labyrinth](${mazeImage})`
    : `![Labyrinth](${mazeImage})

${statusBlock}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        showSidebar ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={won ? "Level cleared 🎉" : introing ? "Get ready…" : "Exploring…"}
                color={won ? Color.Green : introing ? Color.Yellow : Color.Orange}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Level" text={String(game.level)} />
            <Detail.Metadata.TagList title="Difficulty">
              <Detail.Metadata.TagList.Item text={briefing.rank} color={RANK_COLOR[briefing.rank]} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="Score" text={`${score} pts`} />
            <Detail.Metadata.Label title="Gems" text={`${game.gemTotal - game.gems.length}/${game.gemTotal}`} />
            {game.needsKey && (
              <Detail.Metadata.TagList title="Key">
                <Detail.Metadata.TagList.Item
                  text={game.hasKey ? "🔑 Found" : "🔒 Missing"}
                  color={game.hasKey ? Color.Green : Color.Red}
                />
              </Detail.Metadata.TagList>
            )}
            {game.fogRadius !== null && (
              <Detail.Metadata.TagList title="Light">
                <Detail.Metadata.TagList.Item
                  text={game.lit ? "🕯️ Lit" : "🌑 Dark"}
                  color={game.lit ? Color.Yellow : Color.SecondaryText}
                />
              </Detail.Metadata.TagList>
            )}
            {(game.ice || game.shifting || game.trailLife !== null) && (
              <Detail.Metadata.TagList title="Hazards">
                {game.ice && <Detail.Metadata.TagList.Item text="🧊 Icy floor" color={Color.Blue} />}
                {game.shifting && <Detail.Metadata.TagList.Item text="🧱 Shifting walls" color={Color.Orange} />}
                {game.trailLife === 0 && <Detail.Metadata.TagList.Item text="🐾 No footprints" color={Color.Magenta} />}
                {game.trailLife !== null && game.trailLife > 0 && (
                  <Detail.Metadata.TagList.Item text={`🐾 Footprints fade (${game.trailLife})`} color={Color.Magenta} />
                )}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Label title="Moves" text={String(game.moves)} />
            <Detail.Metadata.Label title="Time" text={elapsed} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Best"
              text={best.level > 0 ? `Level ${best.level} · ${best.score} pts` : "—"}
            />
            <Detail.Metadata.Label title="Move" text={introing ? "Press ⏎ to start" : MOVE_KEYS_LABEL} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {introing ? (
            <Action title="Start" icon={Icon.Play} onAction={dismissIntro} />
          ) : won ? (
            <Action title="Next Level" icon={Icon.ArrowRight} onAction={() => startLevel(game.level + 1)} />
          ) : null}
          <ActionPanel.Section title="Move">
            <Action
              title="Move up"
              icon={Icon.ArrowUp}
              shortcut={moveShortcut("arrowUp")}
              onAction={() => move("up")}
            />
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={moveShortcut("arrowDown")}
              onAction={() => move("down")}
            />
            <Action
              title="Move Left"
              icon={Icon.ArrowLeft}
              shortcut={moveShortcut("arrowLeft")}
              onAction={() => move("left")}
            />
            <Action
              title="Move Right"
              icon={Icon.ArrowRight}
              shortcut={moveShortcut("arrowRight")}
              onAction={() => move("right")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Game">
            <Action
              title="Restart Level"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={restartLevel}
            />
            <Action
              title={custom ? `New Run (Level ${homeLevel})` : "New Run (Level 1)"}
              icon={Icon.Shuffle}
              shortcut={Keyboard.Shortcut.Common.New}
              onAction={() => startLevel(homeLevel, 0)}
            />
            {custom && (
              <Action title="Configure Level & Modifiers" icon={Icon.Gear} onAction={openCommandPreferences} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={showSidebar ? "Hide Stats Sidebar" : "Show Stats Sidebar"}
              icon={Icon.AppWindowSidebarRight}
              shortcut={Keyboard.Shortcut.Common.Duplicate}
              onAction={toggleSidebar}
            />
            <Action
              title="Reset All Progress"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={resetProgress}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
