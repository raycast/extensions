import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCurrentUserId,
  fetchOrganizations,
  fetchTeams,
  fetchScenarios,
  fetchFolders,
  fetchHooks,
} from "../api/endpoints.js";
import { Folder, Hook, ScenarioItem } from "../api/types.js";
import { createPool } from "../utils/concurrency.js";

let cachedUserId: number | null = null;

function sortItems(items: ScenarioItem[], myUserId: number): ScenarioItem[] {
  return [...items].sort((a, b) => {
    const aIsMine = a.scenario.updatedByUser?.id === myUserId ? 0 : 1;
    const bIsMine = b.scenario.updatedByUser?.id === myUserId ? 0 : 1;
    if (aIsMine !== bIsMine) return aIsMine - bIsMine;
    return (
      new Date(b.scenario.lastEdit).getTime() -
      new Date(a.scenario.lastEdit).getTime()
    );
  });
}

function deduplicateItems(items: ScenarioItem[]): ScenarioItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.org.zone}-${item.org.id}-${item.scenario.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function useScenarios() {
  const [items, setItems] = useState<ScenarioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [skipped, setSkipped] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    const signal = abort.signal;

    setIsLoading(true);
    setItems([]);
    setSkipped([]);

    const skippedOrgs: string[] = [];

    try {
      const myUserId = cachedUserId ?? (await fetchCurrentUserId({ signal }));
      cachedUserId = myUserId;

      const orgs = await fetchOrganizations({ signal });
      if (signal.aborted) return;

      if (orgs.length === 0) {
        setIsLoading(false);
        return;
      }

      const pool = createPool(6);
      let completedOrgs = 0;

      await Promise.allSettled(
        orgs.map(async (org) => {
          try {
            const teams = await pool.run(() =>
              fetchTeams(org.zone, org.id, { signal }),
            );
            if (signal.aborted) return;

            const teamResults = await Promise.allSettled(
              teams.map((team) =>
                pool.run(async () => {
                  const [scenarios, folders, hooks] = await Promise.all([
                    fetchScenarios(org.zone, team.id, { signal }),
                    fetchFolders(org.zone, team.id, { signal }),
                    fetchHooks(org.zone, team.id, { signal }),
                  ]);

                  const folderMap = new Map<number, Folder>();
                  for (const folder of folders) {
                    folderMap.set(folder.id, folder);
                  }

                  const hookMap = new Map<number, Hook>();
                  for (const hook of hooks) {
                    if (hook.url) {
                      hookMap.set(hook.id, hook);
                    }
                  }

                  return scenarios.map(
                    (scenario): ScenarioItem => ({
                      scenario,
                      team,
                      org,
                      folder: scenario.folderId
                        ? (folderMap.get(scenario.folderId) ?? null)
                        : null,
                      webhookUrl: scenario.hookId
                        ? (hookMap.get(scenario.hookId)?.url ?? null)
                        : null,
                    }),
                  );
                }),
              ),
            );

            if (signal.aborted) return;

            const batch = teamResults
              .filter(
                (r): r is PromiseFulfilledResult<ScenarioItem[]> =>
                  r.status === "fulfilled",
              )
              .flatMap((r) => r.value);

            if (batch.length > 0) {
              setItems((prev) =>
                sortItems(deduplicateItems([...prev, ...batch]), myUserId),
              );
            }
          } catch {
            skippedOrgs.push(org.name);
          } finally {
            completedOrgs++;
            if (completedOrgs === orgs.length && !signal.aborted) {
              setIsLoading(false);
              if (skippedOrgs.length > 0) {
                setSkipped([...skippedOrgs]);
              }
            }
          }
        }),
      );
    } catch (err) {
      if (!signal.aborted) {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load scenarios",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { data: items, isLoading, skippedOrgs: skipped, revalidate: load };
}
