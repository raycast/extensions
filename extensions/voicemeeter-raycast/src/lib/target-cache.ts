import { VoicemeeterState, VoicemeeterTarget } from "./types";

export type CacheUpdate = {
  targetId: string;
  mute?: boolean;
  gain?: number;
  routes?: boolean[];
};

const cache = new Map<
  string,
  { mute?: boolean; gain?: number; routes?: boolean[] }
>();

export function setMute(targetId: string, mute: boolean): void {
  const entry = cache.get(targetId) ?? {};
  entry.mute = mute;
  cache.set(targetId, entry);
}

export function setGain(targetId: string, gain: number): void {
  const entry = cache.get(targetId) ?? {};
  entry.gain = gain;
  cache.set(targetId, entry);
}

export function setRoutes(targetId: string, routes: boolean[]): void {
  const entry = cache.get(targetId) ?? {};
  entry.routes = routes;
  cache.set(targetId, entry);
}

export function applyFromVoicemeeter(state: VoicemeeterState): void {
  for (const target of state.targets) {
    cache.set(target.id, {
      mute: target.mute,
      gain: target.gain,
      ...(target.routes && { routes: target.routes }),
    });
  }
}

export function mergeIntoState(state: VoicemeeterState): VoicemeeterState {
  const targets: VoicemeeterTarget[] = state.targets.map((target) => {
    const cached = cache.get(target.id);
    if (!cached) {
      return target;
    }
    return {
      ...target,
      ...(cached.mute !== undefined && { mute: cached.mute }),
      ...(cached.gain !== undefined && { gain: cached.gain }),
      ...(cached.routes !== undefined && { routes: cached.routes }),
    };
  });
  return { ...state, targets };
}
