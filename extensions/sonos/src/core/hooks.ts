import { useEffect, useState } from "react";
import { formatPlayingState, getAvailableGroups, getLatestState } from "./sonos";
import * as storage from "./storage";

export function useSerializedState() {
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      const state = await getLatestState();
      const title = await formatPlayingState(state);

      setTitle(title);
      setLoading(false);
    }

    run();
  }, []);

  return {
    title,
    loading,
  };
}

export function useSonos() {
  const [activeGroup, setActiveGroup] = useState<string>();
  const [availableGroups, setAvailableGroups] = useState<string[]>();

  useEffect(() => {
    async function run() {
      const groups = await getAvailableGroups();
      setAvailableGroups(groups);

      const activeGroup = await storage.getActiveGroup();
      setActiveGroup(activeGroup);
    }

    run();
  }, []);

  return {
    availableGroups: availableGroups,
    activeGroup,
  };
}
