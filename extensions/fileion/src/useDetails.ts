import { usePromise } from "@raycast/utils";
import { Detail, loadDetail, loadTrust } from "./lib";

// What is known per title for the life of the command. A request is shared while it is in flight (the selection moving back and forth,
// or the trust line being asked for after the versions, never makes a second one), a plain answer never overwrites one that already
// has its trust line, and a failure is not kept: selecting the title again, or Try Again, asks again.
const loaded = new Map<string, Detail>();
const detailPending = new Map<string, Promise<Detail>>();
const trustPending = new Map<string, Promise<void>>();
const trustDone = new Set<string>();

function fetchDetail(slug: string): Promise<Detail> {
    const have = loaded.get(slug);
    if (have) return Promise.resolve(have);
    let pending = detailPending.get(slug);
    if (!pending) {
        pending = loadDetail(slug)
            .then((detail) => {
                if (!loaded.has(slug)) loaded.set(slug, detail);
                return loaded.get(slug) as Detail;
            })
            .finally(() => detailPending.delete(slug));
        detailPending.set(slug, pending);
    }
    return pending;
}

function fetchTrust(slug: string): Promise<void> {
    if (trustDone.has(slug)) return Promise.resolve();
    let pending = trustPending.get(slug);
    if (!pending) {
        pending = fetchDetail(slug)
            .then(async (detail) => {
                const trust = await loadTrust(detail);
                loaded.set(slug, { ...(loaded.get(slug) as Detail), trust });
                trustDone.add(slug);
            })
            .finally(() => trustPending.delete(slug));
        trustPending.set(slug, pending);
    }
    return pending;
}

export type DetailEntry = {
    state: "loading" | "error" | "ready";
    detail?: Detail;
    error?: string;
    retry?: () => void;
};

/**
 * The details of the selected title only: one request for its versions, and a second for its checks when `withTrust` (the person
 * moved to that row). Nothing is prefetched for the rows around it: the keyless API has a per-address limit and an All search
 * already spends 4.
 */
export function useDetails(selected: string | null, withTrust = false): (slug: string) => DetailEntry {
    const { error, revalidate } = usePromise(
        async (slug: string | null, trust: boolean) => {
            if (!slug) return;
            await fetchDetail(slug);
            if (trust) await fetchTrust(slug);
        },
        [selected, withTrust],
        { execute: selected !== null },
    );

    return (slug) => {
        const detail = loaded.get(slug);
        if (detail) return { state: "ready", detail };
        if (error && slug === selected) return { state: "error", error: error.message, retry: revalidate };
        return { state: "loading" };
    };
}
