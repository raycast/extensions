import { useCallback, useEffect, useRef, useState } from "react";
import { session } from "./api";
import { read, write } from "./store";
import { selectedWorkspace } from "./domain";
import { message } from "./actions";
import { useAuth } from "../components/auth";
import type { Session } from "./types";

export function useWorkspaces() {
  const auth = useAuth();
  const [data, setData] = useState<Session>();
  const [workspaceId, setWorkspaceId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const load = useCallback(
    async (force = false) => {
      const current = ++generation.current;
      setLoading(true);
      setError("");
      try {
        const result = await session(force);
        const saved = await read<string>("workspace");
        if (generation.current !== current) return;
        setData(result);
        setWorkspaceId(selectedWorkspace(result.workspaces, saved));
      } catch (error) {
        if (generation.current === current && !auth.handle(error)) {
          setData(undefined);
          setError(message(error));
        }
      } finally {
        if (generation.current === current) setLoading(false);
      }
    },
    [auth],
  );
  useEffect(() => {
    void load();
    return () => {
      generation.current++;
    };
  }, [load]);
  const select = useCallback((id: string) => {
    setWorkspaceId(id);
    void write("workspace", id);
  }, []);
  const reload = useCallback(() => load(true), [load]);
  return { data, workspaceId, select, error, loading, reload };
}
