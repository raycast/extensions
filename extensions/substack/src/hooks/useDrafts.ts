import { useCallback, useEffect, useRef, useState } from "react";

import { type AccountSummary, resolveAccount } from "@/lib/accounts";
import { type NewsletterDraft, listNewsletterDrafts } from "@/lib/listDrafts";
import { type RecoveryRecord, listRecovery } from "@/lib/recovery";
import { publicationOrigin } from "@/lib/substackClient";

type State = {
  key: string;
  drafts: NewsletterDraft[];
  recovery: RecoveryRecord[];
  nextOffset?: number;
  isLoading: boolean;
  error?: string;
};
export default function useDrafts(account?: AccountSummary) {
  const key = account ? `${account.id}:${publicationOrigin(account.publication)}` : "";
  const [state, setState] = useState<State>({ key: "", drafts: [], recovery: [], isLoading: false });
  const generation = useRef(0);
  const activeKey = useRef(key);
  activeKey.current = key;
  const loading = useRef(false);
  const load = useCallback(
    async (offset = 0) => {
      const current = ++generation.current;
      if (!account) {
        setState({ key, drafts: [], recovery: [], isLoading: false });
        return;
      }
      loading.current = true;
      setState((previous) => ({
        key,
        drafts: offset && previous.key === key ? previous.drafts : [],
        recovery: offset && previous.key === key ? previous.recovery : [],
        isLoading: true,
      }));
      let recovery: RecoveryRecord[] = [];
      try {
        const connection = await resolveAccount(account.id);
        if (publicationOrigin(connection.publication) !== publicationOrigin(account.publication))
          throw new Error("This connection changed. Refresh accounts before listing drafts.");
        recovery = await listRecovery(account.id);
        const page = await listNewsletterDrafts(connection, offset);
        if (current !== generation.current || activeKey.current !== key) return;
        setState((previous) => ({
          key,
          drafts: [...(offset && previous.key === key ? previous.drafts : []), ...page.drafts].filter(
            (d, i, all) => all.findIndex((other) => other.id === d.id) === i,
          ),
          recovery,
          nextOffset: page.nextOffset,
          isLoading: false,
        }));
      } catch (error) {
        if (current === generation.current && activeKey.current === key)
          setState((previous) => ({
            ...previous,
            key,
            recovery,
            isLoading: false,
            error: error instanceof Error ? error.message : "Could not list Substack drafts.",
          }));
      } finally {
        if (current === generation.current) loading.current = false;
      }
    },
    [key],
  );
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const visible = state.key === key ? state : { key, drafts: [], recovery: [], isLoading: !!account };
  return {
    ...visible,
    refresh: () => load(),
    loadMore: () =>
      !loading.current && visible.nextOffset !== undefined ? load(visible.nextOffset) : Promise.resolve(),
  };
}
