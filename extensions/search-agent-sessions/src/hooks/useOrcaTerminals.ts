import { useEffect, useRef, useState } from "react";
import {
  listTerminals,
  liveSessionHandles,
  type LiveSessionMap,
  type OrcaTerminal,
} from "../lib/orca";

export interface OrcaState {
  terminals: OrcaTerminal[];
  /** Sessions currently running in Orca; see {@link LiveSessionMap} for the key. */
  live: LiveSessionMap;
}

/**
 * One `orca terminal list` on mount, then a parallel sweep of pane previews to
 * learn which session each pane is actually running. Entirely off the keystroke
 * path; rows gain their live indicator when it lands.
 *
 * Skipped entirely unless Orca is the terminal sessions resume in. The sweep
 * costs a subprocess per pane, and a live dot that Enter will not act on, the
 * user having chosen Ghostty, promises something the row cannot do.
 */
export function useOrcaTerminals(enabled: boolean): OrcaState {
  const [state, setState] = useState<OrcaState>({
    terminals: [],
    live: new Map(),
  });
  const alive = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    alive.current = true;
    (async () => {
      let terminals: OrcaTerminal[] = [];
      try {
        terminals = await listTerminals();
      } catch {
        return; // Orca not running; every row simply resumes instead of focusing.
      }
      if (!alive.current) return;
      setState({ terminals, live: new Map() });
      const live = await liveSessionHandles(terminals);
      if (!alive.current) return;
      setState({ terminals, live });
    })();
    return () => {
      alive.current = false;
    };
  }, [enabled]);

  return state;
}
