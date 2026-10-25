import {
  environment,
  launchCommand,
  LaunchType,
  LocalStorage,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import { WorkflowRun } from "./model";
import { prepareNotifier } from "./notifications";
import { parseStored, RunState, stateKey, TrackedRun, trackingPrefix } from "./tracking";

export function useTrackedRuns(token: string) {
  const prefix = trackingPrefix(token);
  const [tracked, setTracked] = useState<TrackedRun[]>([]);
  const saving = useRef(false);
  const reload = useCallback(async () => {
    const items = await LocalStorage.allItems();
    const watches = Object.entries(items)
      .filter(([key]) => key.startsWith(prefix))
      .flatMap(([, value]) => {
        const watch = parseStored<TrackedRun>(value);
        if (!watch?.subscription || !watch.run?.id) return [];
        const state = parseStored<RunState>(items[stateKey(watch)]);
        return [{ ...watch, run: state?.run ?? watch.run }];
      });
    setTracked(watches);
  }, [prefix]);

  useEffect(() => {
    void reload().catch(console.error);
    const timer = setInterval(() => void reload().catch(console.error), 30_000);
    return () => clearInterval(timer);
  }, [reload]);

  const toggle = async (run: WorkflowRun) => {
    if (saving.current) return;
    saving.current = true;
    try {
      const key = `${prefix}${run.id}`;
      const existing = parseStored<TrackedRun>(await LocalStorage.getItem<string>(key));
      if (existing) {
        await LocalStorage.removeItem(key);
        await LocalStorage.removeItem(stateKey(existing));
      } else {
        if (run.status === "completed") {
          throw new Error("Completed runs cannot be tracked. Choose a queued or running run.");
        }
        await prepareNotifier(environment.assetsPath);
        const watch: TrackedRun = {
          subscription: randomUUID(),
          run,
          baselineAttempt: run.run_attempt - 1,
        };
        await LocalStorage.setItem(key, JSON.stringify(watch));
      }
      await reload();
      await showToast({
        style: Toast.Style.Success,
        title: existing ? "Run notifications disabled" : "Run notifications enabled",
        message: existing
          ? undefined
          : "Enable Background Refresh for Watch CI Notifications in extension preferences.",
        primaryAction: existing ? undefined : { title: "Open Preferences", onAction: openExtensionPreferences },
      });
      if (!existing) {
        try {
          await launchCommand({ name: "watch-ci", type: LaunchType.Background });
        } catch {
          await showToast({
            style: Toast.Style.Failure,
            title: "Run saved; start Watch CI Notifications",
            message: "Open the command once and enable Background Refresh in Raycast preferences.",
          });
        }
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Unable to change run notifications",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      saving.current = false;
    }
  };

  return { tracked, toggle, reload };
}
