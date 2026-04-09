import {
  normalizeEvent,
  shouldOpenRaycast,
  shouldNotifyEvent,
} from "./lib/event-schema.mjs";
import { compactEvent } from "./lib/event-summary.mjs";
import { writeEvent } from "./lib/state-store.mjs";
import { triggerRaycast } from "./lib/raycast-deeplink.mjs";
import { showMacNotification } from "./lib/fallback-notifier.mjs";
import { playSoundForEvent } from "./lib/playback.mjs";
import { ensureUserData, defaultRootDir } from "./lib/sound-config.mjs";

export async function main({ source } = {}) {
  const MAX_RECENT = Number(process.env.CLAUDE_NOTIFIER_MAX_RECENT ?? "10");
  const rootDir = defaultRootDir();
  const { paths } = await ensureUserData({ rootDir });
  const STATE_FILE = process.env.CLAUDE_NOTIFIER_STATE_FILE ?? paths.stateFile;

  const rawInput = await readStdin();
  const raw = rawInput ? JSON.parse(rawInput) : {};

  return runEventBridge({
    source,
    raw,
    rootDir: paths.rootDir,
    stateFile: STATE_FILE,
    maxRecent: MAX_RECENT,
  });
}

export async function runEventBridge({
  source,
  raw = {},
  rootDir = defaultRootDir(),
  stateFile,
  maxRecent = Number(process.env.CLAUDE_NOTIFIER_MAX_RECENT ?? "10"),
} = {}) {
  const { paths } = await ensureUserData({ rootDir });
  const resolvedStateFile = stateFile ?? paths.stateFile;
  const event = normalizeEvent(
    source ? { ...raw, source } : raw,
    source ? { ...process.env, AI_NOTIFIER_SOURCE: source } : process.env,
  );
  const displayEvent = compactEvent(event);

  const shouldNotify = shouldNotifyEvent(displayEvent);
  const playback = shouldNotify
    ? await playSoundForEvent(displayEvent, { rootDir: paths.rootDir })
    : {
        slot: displayEvent.soundSlot ?? displayEvent.type ?? "running",
        hookKey: displayEvent.hookKey ?? null,
        soundId: null,
        filePath: null,
        reason: "skipped",
        played: false,
        playedAt: null,
        error: null,
      };

  const state = await writeEvent(resolvedStateFile, displayEvent, maxRecent, {
    lastPlayedAt: playback.played ? playback.playedAt : null,
    lastPlayedSoundId: playback.played ? playback.soundId : null,
    lastSlot: playback.slot ?? displayEvent.soundSlot ?? null,
    lastError: playback.error ?? playback.reason,
  });

  if (shouldNotify) {
    if (shouldOpenRaycast(displayEvent)) {
      try {
        await triggerRaycast(displayEvent);
      } catch {
        await showMacNotification(displayEvent.title, displayEvent.message);
      }
    } else {
      await showMacNotification(displayEvent.title, displayEvent.message);
    }
  }

  process.stdout.write(JSON.stringify({ current: state.current, playback }));
  return { current: state.current, playback };
}

async function readStdin() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  return input.trim();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
