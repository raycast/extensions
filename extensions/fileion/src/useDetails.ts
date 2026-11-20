import { useEffect, useState } from "react";
import { Detail, loadDetail, loadTrust } from "./lib";

// One answer per title for the life of the command: a row is "loading" only until its answer (or its error) is here, so it can never
// stay "…" because the selection or the shared loading flag of an earlier request got out of step.
const loaded = new Map<string, Detail>();
const failed = new Map<string, string>();
const trustAsked = new Set<string>();

export type DetailEntry = { state: "loading" | "error" | "ready"; detail?: Detail; error?: string };

/**
 * The details of the selected title only: one request for its versions, and a second for its checks when `withTrust` (the person
 * moved to that row). Nothing is prefetched for the rows around it: the keyless API has a per-address limit and an All search
 * already spends 4.
 */
export function useDetails(selected: string | null, withTrust = false): (slug: string) => DetailEntry {
    const [, rerender] = useState(0);

    useEffect(() => {
        let cancelled = false;
        if (!selected || failed.has(selected)) return;
        (async () => {
            try {
                if (!loaded.has(selected)) loaded.set(selected, await loadDetail(selected));
                const detail = loaded.get(selected) as Detail;
                if (withTrust && !trustAsked.has(selected)) {
                    trustAsked.add(selected);
                    loaded.set(selected, { ...detail, trust: await loadTrust(detail) });
                }
            } catch (e) {
                failed.set(selected, e instanceof Error ? e.message : String(e));
            }
            if (!cancelled) rerender((n) => n + 1);
        })();
        return () => {
            cancelled = true;
        };
    }, [selected, withTrust]);

    return (slug) => {
        const detail = loaded.get(slug);
        if (detail) return { state: "ready", detail };
        const error = failed.get(slug);
        return error ? { state: "error", error } : { state: "loading" };
    };
}
