import { useCachedPromise } from "@raycast/utils";
import { getRecord } from "../api/endpoints";
import { recordTitle } from "../lib/display";
import { shortId } from "../lib/format";
import { cacheNs } from "./useSelf";

export type RecordRef = { target_object: string; target_record_id: string };
const CAP = 25; // spec §8.2 — beyond this, fall back to slug · shortId labels

/** Batched record-title resolver. Ref failures resolve to undefined (caller renders the fallback). */
export function useRecordTitles(refs: RecordRef[]) {
  const unique = [...new Map(refs.map((r) => [`${r.target_object}/${r.target_record_id}`, r])).values()];
  const capped = unique.slice(0, CAP);
  const key = capped
    .map((r) => `${r.target_object}/${r.target_record_id}`)
    .sort()
    .join("|");

  const { data, isLoading } = useCachedPromise(
    async (_fp: string, _key: string, wanted: RecordRef[]) => {
      const settled = await Promise.allSettled(
        wanted.map(async (r) => {
          const { data } = await getRecord(r.target_object, r.target_record_id);
          const title = recordTitle(data, r.target_object);
          return {
            id: r.target_record_id,
            title: title !== shortId(data.id.record_id) ? title : undefined,
            url: data.web_url,
          };
        }),
      );
      const map: Record<string, { title?: string; url?: string }> = {};
      for (const s of settled) if (s.status === "fulfilled") map[s.value.id] = s.value;
      return map;
    },
    [cacheNs, key, capped],
    { execute: capped.length > 0 },
  );

  return {
    titleFor: (recordId: string) => {
      const hit = data?.[recordId];
      return hit?.title ? { title: hit.title, url: hit.url } : undefined;
    },
    isLoading: capped.length > 0 && isLoading,
  };
}
