import { addHistoryEntry, getHistory, popUndoEntry } from "./history";
import { makeId } from "./id";
import { enqueueSerialized } from "./queue";
import { getEffectiveSettings } from "./settings";
import { MAX_GAIN_DB, MIN_GAIN_DB } from "./target";
import {
  ActionResult,
  ProfileDefinition,
  VoicemeeterState,
  VoicemeeterTarget,
} from "./types";
import {
  getRouteTokenForBusIndex,
  launchVoicemeeter,
  readTargetCurrentMute,
  readVoicemeeterState,
  writeStripRoute,
  writeTargetGain,
  writeTargetMute,
} from "./voicemeeter";

function muteValue(mute: boolean): number {
  return mute ? 1 : 0;
}

async function pushHistoryMute(
  target: VoicemeeterTarget,
  before: boolean,
  after: boolean,
  ttlMs: number,
): Promise<void> {
  const now = Date.now();
  await addHistoryEntry({
    id: makeId(),
    at: now,
    expiresAt: now + ttlMs,
    targetId: target.id,
    targetName: target.name,
    targetKind: target.kind,
    targetIndex: target.index,
    parameter: "mute",
    before: muteValue(before),
    after: muteValue(after),
  });
}

async function pushHistoryGain(
  target: VoicemeeterTarget,
  before: number,
  after: number,
  ttlMs: number,
): Promise<void> {
  const now = Date.now();
  await addHistoryEntry({
    id: makeId(),
    at: now,
    expiresAt: now + ttlMs,
    targetId: target.id,
    targetName: target.name,
    targetKind: target.kind,
    targetIndex: target.index,
    parameter: "gain",
    before,
    after,
  });
}

export async function loadState(): Promise<VoicemeeterState> {
  return readVoicemeeterState();
}

export async function toggleTargetMute(
  target: VoicemeeterTarget,
): Promise<ActionResult> {
  return enqueueSerialized(async () => {
    const settings = await getEffectiveSettings();
    let current = target.mute;

    if (settings.muteBehavior === "refresh-then-toggle") {
      const fresh = await readTargetCurrentMute(target);
      if (fresh === undefined) {
        return {
          ok: false,
          skipped: true,
          message: "Skipped: target unavailable.",
        };
      }
      current = fresh;
    }

    if (settings.muteBehavior === "explicit-idempotent") {
      return {
        ok: false,
        skipped: true,
        message: "Switch behavior to toggle or use explicit mute/unmute.",
      };
    }

    const next = !current;
    const changed = await writeTargetMute(target, next);
    if (!changed) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: Voicemeeter unavailable.",
      };
    }

    await pushHistoryMute(target, current, next, settings.undoTtlMs);
    return {
      ok: true,
      message: `${target.name}: ${next ? "muted" : "unmuted"}.`,
      newMute: next,
    };
  });
}

export async function setTargetMute(
  target: VoicemeeterTarget,
  mute: boolean,
): Promise<ActionResult> {
  return enqueueSerialized(async () => {
    const settings = await getEffectiveSettings();
    const before = await readTargetCurrentMute(target);
    if (before === undefined) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: target unavailable.",
      };
    }
    if (before === mute) {
      return {
        ok: true,
        message: `${target.name} already ${mute ? "muted" : "unmuted"}.`,
        newMute: mute,
      };
    }

    const changed = await writeTargetMute(target, mute);
    if (!changed) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: Voicemeeter unavailable.",
      };
    }

    await pushHistoryMute(target, before, mute, settings.undoTtlMs);
    return {
      ok: true,
      message: `${target.name}: ${mute ? "muted" : "unmuted"}.`,
      newMute: mute,
    };
  });
}

export async function adjustTargetGain(
  target: VoicemeeterTarget,
  delta: number,
): Promise<ActionResult> {
  const next = Math.max(
    MIN_GAIN_DB,
    Math.min(MAX_GAIN_DB, Math.round((target.gain + delta) * 100) / 100),
  );
  return setTargetGain(target, next);
}

export async function setTargetGain(
  target: VoicemeeterTarget,
  gain: number,
): Promise<ActionResult> {
  return enqueueSerialized(async () => {
    if (gain < MIN_GAIN_DB || gain > MAX_GAIN_DB || !Number.isFinite(gain)) {
      return {
        ok: false,
        skipped: true,
        message: `Invalid value. Use ${MIN_GAIN_DB} to ${MAX_GAIN_DB} dB.`,
      };
    }

    const settings = await getEffectiveSettings();
    const rounded = Math.round(gain * 100) / 100;
    const before = target.gain;
    if (Math.abs(before - rounded) < 0.001) {
      return {
        ok: true,
        message: `${target.name} already ${rounded.toFixed(2)} dB.`,
      };
    }

    const changed = await writeTargetGain(target, rounded);
    if (!changed) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: Voicemeeter unavailable.",
      };
    }

    await pushHistoryGain(target, before, rounded, settings.undoTtlMs);
    return { ok: true, message: `${target.name}: ${rounded.toFixed(2)} dB.` };
  });
}

export async function setStripBusConnection(
  strip: VoicemeeterTarget,
  bus: VoicemeeterTarget,
  enabled: boolean,
  capabilities: VoicemeeterState["capabilities"],
): Promise<ActionResult> {
  return enqueueSerialized(async () => {
    if (strip.kind !== "strip" || bus.kind !== "bus") {
      return {
        ok: false,
        skipped: true,
        message: "Invalid target pair.",
      };
    }

    const routeToken = getRouteTokenForBusIndex(
      capabilities.edition,
      capabilities.busCount,
      bus.index,
    );
    if (!routeToken) {
      return {
        ok: false,
        skipped: true,
        message: "Bus route is not available.",
      };
    }

    const before = strip.routes?.[bus.index];
    if (before !== undefined && before === enabled) {
      return {
        ok: true,
        message: `${strip.name} already ${enabled ? "connected to" : "disconnected from"} ${bus.name}.`,
      };
    }

    const changed = await writeStripRoute(strip.index, routeToken, enabled);
    if (!changed) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: Voicemeeter unavailable.",
      };
    }

    return {
      ok: true,
      message: `${strip.name}: ${enabled ? "connected to" : "disconnected from"} ${bus.name}.`,
    };
  });
}

export async function applyProfile(
  profile: ProfileDefinition,
  targets: VoicemeeterTarget[],
  capabilities: VoicemeeterState["capabilities"],
): Promise<ActionResult> {
  return enqueueSerialized(async () => {
    const settings = await getEffectiveSettings();
    let changedCount = 0;

    for (const target of targets) {
      const override = target.identityKeys
        .map((key) => profile.overrides[key])
        .find(Boolean);
      const mute = override?.mute ?? profile.global.mute;
      const gain = override?.gain ?? profile.global.gain;

      if (typeof mute === "boolean") {
        const ok = await writeTargetMute(target, mute);
        if (ok) {
          await pushHistoryMute(target, target.mute, mute, settings.undoTtlMs);
          changedCount += 1;
        }
      }

      if (
        typeof gain === "number" &&
        Number.isFinite(gain) &&
        gain >= MIN_GAIN_DB &&
        gain <= MAX_GAIN_DB
      ) {
        const normalized = Math.round(gain * 100) / 100;
        const ok = await writeTargetGain(target, normalized);
        if (ok) {
          await pushHistoryGain(
            target,
            target.gain,
            normalized,
            settings.undoTtlMs,
          );
          changedCount += 1;
        }
      }
    }

    if (profile.routes) {
      const strips = targets.filter((t) => t.kind === "strip");
      for (const strip of strips) {
        const routes = profile.routes[strip.id];
        if (!routes) continue;
        for (let busIndex = 0; busIndex < routes.length; busIndex += 1) {
          const routeToken = getRouteTokenForBusIndex(
            capabilities.edition,
            capabilities.busCount,
            busIndex,
          );
          if (!routeToken) continue;
          const enabled = routes[busIndex] ?? false;
          const current = strip.routes?.[busIndex] ?? false;
          if (current === enabled) continue;
          const ok = await writeStripRoute(strip.index, routeToken, enabled);
          if (ok) changedCount += 1;
        }
      }
    }

    if (changedCount === 0) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: profile had no applicable changes.",
      };
    }

    return {
      ok: true,
      message: `Applied profile "${profile.name}" (${changedCount} changes).`,
    };
  });
}

export async function undoLastChange(): Promise<ActionResult> {
  return enqueueSerialized(async () => {
    const item = await popUndoEntry();
    if (!item) {
      return {
        ok: false,
        skipped: true,
        message: "No undo entries available.",
      };
    }

    const target: VoicemeeterTarget = {
      id: item.targetId,
      kind: item.targetKind,
      index: item.targetIndex,
      name: item.targetName,
      gain: item.parameter === "gain" ? item.after : 0,
      mute: item.parameter === "mute" ? item.after >= 0.5 : false,
      identityKeys: [],
    };

    if (item.parameter === "mute") {
      const ok = await writeTargetMute(target, item.before >= 0.5);
      if (!ok) {
        return {
          ok: false,
          skipped: true,
          message: "Skipped: Voicemeeter unavailable for undo.",
        };
      }
      return { ok: true, message: `${target.name}: mute undone.` };
    }

    const ok = await writeTargetGain(target, item.before);
    if (!ok) {
      return {
        ok: false,
        skipped: true,
        message: "Skipped: Voicemeeter unavailable for undo.",
      };
    }
    return { ok: true, message: `${target.name}: gain undone.` };
  });
}

export async function getUndoCount(): Promise<number> {
  const entries = await getHistory();
  return entries.length;
}

export async function launchVoicemeeterFromSettings(): Promise<ActionResult> {
  const settings = await getEffectiveSettings();
  if (!settings.voicemeeterExecutablePath) {
    return { ok: false, skipped: true, message: "Set executable path first." };
  }
  const ok = await launchVoicemeeter(settings.voicemeeterExecutablePath);
  if (!ok) {
    return {
      ok: false,
      skipped: true,
      message: "Failed to launch Voicemeeter.",
    };
  }
  return { ok: true, message: "Voicemeeter launch requested." };
}
