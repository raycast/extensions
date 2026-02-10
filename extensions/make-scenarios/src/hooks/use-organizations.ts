import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOrganizations, fetchTeams } from "../api/endpoints.js";
import { Organization, Team } from "../api/types.js";
import { createPool } from "../utils/concurrency.js";

export interface OrgTeamItem {
  org: Organization;
  team: Team;
}

export function useOrganizations() {
  const [items, setItems] = useState<OrgTeamItem[]>([]);
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
      const orgs = await fetchOrganizations({ signal });
      if (signal.aborted) return;

      if (orgs.length === 0) {
        setIsLoading(false);
        return;
      }

      const pool = createPool(6);
      const allBatches: OrgTeamItem[] = [];

      await Promise.allSettled(
        orgs.map(async (org) => {
          try {
            const teams = await pool.run(() =>
              fetchTeams(org.zone, org.id, { signal }),
            );
            if (signal.aborted) return;

            const batch = teams.map((team) => ({ org, team }));
            allBatches.push(...batch);

            setItems(
              [...allBatches].sort((a, b) =>
                a.org.name.localeCompare(b.org.name),
              ),
            );
          } catch {
            skippedOrgs.push(org.name);
          }
        }),
      );

      if (!signal.aborted) {
        setIsLoading(false);
        if (skippedOrgs.length > 0) {
          setSkipped([...skippedOrgs]);
        }
      }
    } catch (err) {
      if (!signal.aborted) {
        setIsLoading(false);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load organizations",
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
