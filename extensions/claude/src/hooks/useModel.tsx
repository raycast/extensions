import { Clipboard, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Model, ModelHook } from "../type";
import { fetchAvailableModels, type AvailableModel } from "../api/models";
import { createCollectionStore, type CollectionStore } from "../stores/collection";
import { mutations } from "../stores/useStoredCollection";
import { getApiKeyToastAction } from "../utils/errors";
import { findNewestModelInTier, getMaxTokensForModel, shortModelName } from "../utils/models";
import { buildSeedPresets } from "../utils/presets";
import { showResolvedToast } from "../utils/toast";

const MODELS_KEY = "models";

/** Marks that starter presets have been seeded, so a deleted preset stays deleted. */
const PRESETS_SEEDED_KEY = "presets_seeded_v1";

const DEFAULT_PROMPT = "You are a useful assistant";

/** The generic name the built-in preset originally shipped with. */
const LEGACY_DEFAULT_NAME = "Default Model";

/**
 * The built-in preset. Its `option` is a last-resort fallback: on load it is re-pointed
 * at the newest Sonnet from the live model list.
 */
export const DEFAULT_MODEL: Model = {
  id: "default",
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  name: LEGACY_DEFAULT_NAME,
  prompt: DEFAULT_PROMPT,
  option: "claude-sonnet-4-5-20250929",
  temperature: "1",
  max_tokens: "4096",
  pinned: false,
};

// Fallback options for the picker if the models API and cache are both unavailable.
// Same reasoning as `FALLBACK_MODELS` in `src/api/models.ts`: no Opus id is listed,
// because the last one hardcoded here outlived its own availability.
const FALLBACK_OPTIONS: Model["option"][] = ["claude-sonnet-4-5-20250929", "claude-haiku-4-5-20251001"];

/**
 * The models collection store. `keep` carries `clear()`-preserves-`DEFAULT_MODEL`
 * structurally (the collection store), rather than the hand-rolled `filter(id === "default")`
 * this hook used to do inside its own `setData` updater.
 */
export const modelsStore: CollectionStore<Model> = createCollectionStore<Model>(MODELS_KEY, {
  keep: (model) => model.id === DEFAULT_MODEL.id,
});

/**
 * Returns true when the built-in preset still holds an auto-managed name and the shipped
 * prompt — i.e. the user has never edited it. Only then is it safe to re-point and rename.
 *
 * The name test accepts any name this hook could itself have written (the original
 * "Default Model", or a bare model name from a previous launch), not just the original.
 * A strict equality check would freeze the preset on the first model it was renamed to,
 * so it could never follow a newer Sonnet — and would also miss the pre-`shortModelName`
 * names that still carry the "Claude " prefix.
 */
export function isAutoManagedName(name: string, availableModels: AvailableModel[]): boolean {
  if (name === LEGACY_DEFAULT_NAME) return true;
  return availableModels.some((model) => name === model.display_name || name === shortModelName(model.display_name));
}

export function isUntouchedDefault(model: Model, availableModels: AvailableModel[]): boolean {
  return model.id === "default" && model.prompt === DEFAULT_PROMPT && isAutoManagedName(model.name, availableModels);
}

/**
 * The seed-once decision: pure enough to test directly, and kept separate from the
 * effect so a preset the user deletes stays deleted regardless of how many times the
 * hook mounts across the commands that use it.
 */
export async function shouldSeedPresets(): Promise<boolean> {
  const alreadySeeded = await LocalStorage.getItem<string>(PRESETS_SEEDED_KEY);
  return !alreadySeeded;
}

/**
 * True only when the `"models"` key has never been written at all — a genuinely fresh
 * install. This is a DIFFERENT question from "is the list empty": `store.read()`/
 * `readRaw()` return `[]` for both "key absent" and "key present but holds `[]`", and
 * that collapse is exactly what caused the round-1 regression (an unconditional
 * `store.add(DEFAULT_MODEL)` on every mount resurrected a default the user had
 * deliberately deleted, because "key present, default missing" and "key absent" both
 * read as "no default in the list").
 *
 * Deliberately reads the RAW key via `LocalStorage.getItem` directly rather than going
 * through the store, and deliberately does NOT reuse `PRESETS_SEEDED_KEY` — that marker
 * answers "have the four starter presets been seeded," a question with its own
 * independent history (a user upgrading from before this task already has it set to
 * `"true"` while never having had a synthesized default row gated by it). Folding this
 * check into that marker would answer a question it was never used to answer, for users
 * whose marker state predates this distinction entirely.
 *
 * Not exported: nothing outside `seedDefaultIfMissing` (below) needs to ask this
 * question in isolation, and the round-1 regression was exactly a copy of the `if`
 * around a call to this function living somewhere OTHER than production. Keeping this
 * un-exported, with the guard fused into the same function as the write it guards,
 * removes the seam a copy could form around.
 */
async function isModelsKeyAbsent(): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(MODELS_KEY);
  return raw === undefined;
}

/**
 * Seeds the built-in default row, but ONLY on a genuinely fresh install — matching the
 * pre-Task-4 `getStoredModels()`'s `if (!storedModels) return [DEFAULT_MODEL]`.
 *
 * This function IS the guard: the `if` and the `add` it protects live in the same
 * function body, exported, and this is the ONLY thing `useModel`'s load effect calls to
 * seed the default. There is nothing left for a test to duplicate — driving this
 * function IS driving the production call site, not a copy of it. (Round 1's defect was
 * a copy of `if (await isModelsKeyAbsent()) { await store.add(...) }` living in the test
 * file instead of only in the hook; bypassing the REAL `if` at the hook's call site was
 * invisible to that test. Fusing the guard and the write into one exported function that
 * the hook calls, with no inline `if` left at the call site to bypass, closes that gap.)
 *
 * Must run before anything else writes to `MODELS_KEY` in the same load — the check and
 * the write are already atomic with respect to each other here (no `await` of anything
 * unrelated in between), so the only ordering obligation left is on the CALLER: call
 * this before any other seeding step touches `MODELS_KEY`.
 */
export async function seedDefaultIfMissing(store: CollectionStore<Model>): Promise<void> {
  if (await isModelsKeyAbsent()) {
    await store.add(DEFAULT_MODEL);
  }
}

/**
 * Seeds starter presets exactly once, gated by `PRESETS_SEEDED_KEY`, so a preset the
 * user deletes stays deleted. Uses `store.add` per seed (id-match no-op) so a race with
 * another mounted command's seeding can't duplicate a row.
 *
 * Exported and called directly by `loadModels` below for the same reason
 * `seedDefaultIfMissing` is: the `if` and the seeding it guards live in one function,
 * so there is no call-site `if` outside this file for a test (or a future edit) to
 * duplicate or silently drop.
 */
export async function seedStarterPresetsOnce(
  store: CollectionStore<Model>,
  liveModels: AvailableModel[],
): Promise<void> {
  if (await shouldSeedPresets()) {
    const seeds = buildSeedPresets(liveModels, new Date().toISOString());
    for (const seed of seeds) {
      await store.add(seed);
    }
    await LocalStorage.setItem(PRESETS_SEEDED_KEY, "true");
  }
}

/**
 * Repoints the untouched built-in default to the newest Sonnet, if eligible and if a
 * repoint is actually needed. Returns the row to write via `store.update`, or `null`
 * when nothing changed (no untouched default, no newest Sonnet, or it already points at
 * the newest Sonnet under the short name). A preset the user has edited is left alone —
 * see `isUntouchedDefault`.
 *
 * Pure decision over an already-read list — no I/O of its own — so it composes cleanly
 * inside `loadModels`, which owns the read/write around it.
 */
export function computeRepointedDefault(current: Model[], liveModels: AvailableModel[]): Model | null {
  const newestSonnet = findNewestModelInTier(liveModels, "sonnet");
  const existingDefault = current.find((model) => model.id === DEFAULT_MODEL.id);

  if (!existingDefault || !newestSonnet || !isUntouchedDefault(existingDefault, liveModels)) return null;

  const nextName = shortModelName(newestSonnet.display_name);
  const modelCeiling = getMaxTokensForModel(newestSonnet.id, liveModels).toString();

  // `isUntouchedDefault` does NOT look at `max_tokens`, so a user who raised or lowered
  // the built-in preset's output limit still reads as untouched. The ceiling is therefore
  // written ONLY when the model is changing anyway — that value belonged to the old model
  // and cannot survive the move — and never merely because it looks out of date.
  //
  // A default seeded before per-model limits were read from the API sits on 4096 until
  // then. Bumping it on sight was tried and reverted: nothing in storage distinguishes
  // "seeded 4096" from "the user typed 4096", so the bump silently overwrites a real
  // choice. A preset is hand-curated data; where the signal is ambiguous, leave it alone.
  // The user can raise it in the Presets form, and the next repoint does it for free.
  const nextMaxTokens = existingDefault.option !== newestSonnet.id ? modelCeiling : existingDefault.max_tokens;

  if (
    existingDefault.option === newestSonnet.id &&
    existingDefault.name === nextName &&
    existingDefault.max_tokens === nextMaxTokens
  ) {
    return null;
  }

  return {
    ...existingDefault,
    name: nextName,
    option: newestSonnet.id,
    max_tokens: nextMaxTokens,
  };
}

/**
 * The entire load-effect prologue as one exported, directly callable, directly testable
 * unit: seed the default row if the install is fresh, seed starter presets once, decide
 * and apply a Sonnet repoint for an untouched default, and return the resulting list.
 *
 * This is what `useModel`'s load effect calls — there is no orchestration logic left
 * inline in the `useEffect` closure for a test to duplicate. Driving `loadModels`
 * directly against a real `CollectionStore` IS driving the exact sequence production
 * runs, not a reconstruction of it. (This is the same class of fix as `mutations.<name>`
 * in `useStoredCollection.ts`: the seam is the production code, not a copy sitting next
 * to it.)
 */
export async function loadModels(store: CollectionStore<Model>, liveModels: AvailableModel[]): Promise<Model[]> {
  // Must run before anything else writes to `MODELS_KEY` in this load — see
  // `seedDefaultIfMissing`'s docstring.
  await seedDefaultIfMissing(store);

  await seedStarterPresetsOnce(store, liveModels);

  // Read fresh storage right before deciding on a repoint — several commands mount this
  // hook, and `store.update` below re-reads again anyway, so this read is purely to
  // decide WHETHER a write is needed at all.
  const current = await store.read();
  const repointedDefault = computeRepointedDefault(current, liveModels);

  // `update` is the store's structural read-before-write merge (the collection store): it re-reads
  // storage immediately before writing, so a row another mounted command touched in
  // between is not clobbered. The hand-rolled re-read-and-merge this hook used to do
  // (`changedIds` tracking) is gone — the store now provides it.
  return repointedDefault ? await store.update(repointedDefault) : await store.read();
}

export function useModel(): ModelHook {
  const [data, setData] = useState<Model[]>([]);
  // Start loading: `data` is empty on first paint, and a false value here flashes the
  // "no presets" empty state before the stored presets arrive.
  const [isLoading, setLoading] = useState(true);
  const [option, setOption] = useState<Model["option"][]>(FALLBACK_OPTIONS);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);

  const storeRef = useRef(modelsStore);
  const store = storeRef.current;

  useEffect(() => {
    setLoading(true);

    (async () => {
      try {
        const liveModels = await fetchAvailableModels();

        setOption(liveModels.map((model) => model.id as Model["option"]));
        setAvailableModels(liveModels);

        // `loadModels` owns the entire seed/repoint prologue as one directly testable
        // unit — see its docstring. Nothing about seeding or repointing is decided
        // inline here.
        const finalList = await loadModels(store, liveModels);

        setData(finalList);
      } catch (error) {
        // The model list is non-critical: fall back to stored presets so the extension
        // stays usable, and surface the failure without wedging the view.
        const errorMessage = error instanceof Error ? error.message : String(error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Couldn't load models",
          message: errorMessage,
          primaryAction: {
            title: "Copy Error",
            onAction: async () => {
              await Clipboard.copy(errorMessage);
            },
          },
          secondaryAction: getApiKeyToastAction(errorMessage),
        });
        setData(await store.read().catch(() => [DEFAULT_MODEL]));
      } finally {
        setLoading(false);
      }
    })();
    // Runs once per mount — `store` is a module-level singleton (stable identity), and
    // the effect intentionally does not re-run on prop/state changes.
  }, []);

  const add = useCallback(
    async (model: Model) => {
      // No Animated phase — this is a LocalStorage write with no observable latency, and
      // an Animated toast here was the one the user caught stuck mid-spin (see
      // `src/utils/toast.ts`). Report the result directly.
      const newModel: Model = { ...model, created_at: new Date().toISOString() };
      const result = await mutations.add.run(store, (items) => items, newModel);
      setData((previous) => mutations.add.applyTo(result, previous));
      await showResolvedToast({ title: "Preset saved", style: Toast.Style.Success });
    },
    [store],
  );

  const update = useCallback(
    async (model: Model) => {
      const result = await mutations.update.run(store, (items) => items, model);
      setData((previous) => mutations.update.applyTo(result, previous));
    },
    [store],
  );

  const remove = useCallback(
    async (model: Model) => {
      // No Animated phase — see `add` above.
      const result = await mutations.remove.run(store, (items) => items, model.id);
      setData(mutations.remove.applyTo(result));
      await showResolvedToast({ title: "Preset deleted", style: Toast.Style.Success });
    },
    [store],
  );

  const clear = useCallback(async () => {
    // No Animated phase — see `add` above.
    // `store`'s `keep: id === DEFAULT_MODEL.id` option preserves the default preset
    // structurally — see `modelsStore` above. This must NOT reconcile onto `previous`
    // (that's the additive path): `clear` is subtractive, and its returned list IS the
    // next state, per `mutations.clear`/`replaceState`.
    const result = await mutations.clear.run(store, (items) => items);
    setData(mutations.clear.applyTo(result));
    await showResolvedToast({ title: "Presets deleted", style: Toast.Style.Success });
  }, [store]);

  return useMemo(
    () => ({ data, isLoading, option, availableModels, add, update, remove, clear }),
    [data, isLoading, option, availableModels, add, update, remove, clear],
  );
}
