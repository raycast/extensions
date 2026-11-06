import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import path from "node:path";
import { AuditRepository } from "../lib/storage/store";
import { scanBrowsers } from "../lib/browsers/scan";
import { browsers } from "../lib/browsers/registry";
import { AuditStore, emptyStore } from "../lib/model";

export const repository = new AuditRepository(path.join(environment.supportPath, "audit"));
type ViewState = { state: AuditStore; loading: boolean; error?: Error };
let view: ViewState = { state: emptyStore(), loading: true };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => view;
function update(value: Partial<ViewState>) {
  view = { ...view, ...value };
  for (const listener of listeners) listener();
}
let running: Promise<void> | undefined;
let pendingOperations = 0;
function begin() {
  pendingOperations++;
  update({ loading: true });
}
function end() {
  pendingOperations--;
  update({ loading: pendingOperations > 0 });
}
export function useAudit(monitoring = false, autoScan = true) {
  const { state, loading, error } = useSyncExternalStore(subscribe, snapshot);
  const refresh = useCallback(async () => {
    if (running) return running;
    running = (async () => {
      begin();
      try {
        const previous = await repository.read();
        update({ state: previous });
        const { analyzeCode } = getPreferenceValues<Preferences>();
        const result = await repository.scan(
          () => scanBrowsers(browsers, undefined, { analyzeCode: analyzeCode === true }),
          monitoring,
        );
        update({ state: result, error: undefined });
        if (!monitoring && !Object.keys(previous.baselines).length && Object.keys(result.baselines).length) {
          await showToast({
            style: Toast.Style.Success,
            title: "Initial security baseline created",
            message: "Changes will appear after future scans. Check Audit Status for coverage.",
          });
        }
      } catch (cause) {
        update({ error: cause instanceof Error ? cause : new Error("Scan failed") });
      } finally {
        end();
      }
    })();
    try {
      await running;
    } finally {
      running = undefined;
    }
  }, [monitoring]);
  useEffect(() => {
    if (autoScan) void refresh();
  }, [refresh, autoScan]);
  const review = async (ids: string[]) => {
    begin();
    try {
      update({ state: await repository.review(ids) });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not save review", message: String(error) });
    } finally {
      end();
    }
  };
  const reset = async () => {
    begin();
    try {
      await repository.reset();
      await refresh();
    } catch (error) {
      update({ error: error instanceof Error ? error : new Error("Reset failed") });
    } finally {
      end();
    }
  };
  return { state, loading, error, refresh, review, reset };
}
export type Audit = ReturnType<typeof useAudit>;
