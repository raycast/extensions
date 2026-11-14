// Every command that needs a key renders through <Gate>: a Detail while it
// looks for the key, <Connect> when there is none, the command once there is.
// A 401 clears the stored key and goes back to <Connect> (slice 17 reuses it).

import { Detail } from "@raycast/api";
import { ReactNode, useCallback, useEffect, useState } from "react";
import { KansoError } from "./client";
import { Connect } from "./connect-view";
import { clearKey, currentKey, port } from "./session";

export type Session = { key: string; port: number; reconnect: (e: unknown) => Promise<boolean> };

export function Gate(props: { children: (session: Session) => ReactNode }) {
  const [state, setState] = useState<{ step: "checking" } | { step: "needs-key" } | { step: "ready"; key: string }>({
    step: "checking",
  });

  const load = useCallback(async () => {
    const key = await currentKey();
    setState(key ? { step: "ready", key } : { step: "needs-key" });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** For a failed call: on a 401, forgets the key and shows Connect. Returns whether it did. */
  const reconnect = useCallback(async (e: unknown) => {
    if (e instanceof KansoError && e.kind === "unauthorized") {
      await clearKey();
      setState({ step: "needs-key" });
      return true;
    }
    return false;
  }, []);

  if (state.step === "checking") return <Detail isLoading markdown="" />;
  if (state.step === "needs-key") return <Connect onConnected={() => void load()} />;
  let portNumber: number;
  try {
    portNumber = port();
  } catch (e) {
    return <Detail markdown={`# ${(e as Error).message}`} />;
  }
  return <>{props.children({ key: state.key, port: portNumber, reconnect })}</>;
}
