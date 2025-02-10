import { useEffect, useState } from "react";
import { formatPlayingState, getAvailableGroups, getLatestState } from "./sonos";
import * as storage from "./storage";

export function useCurrentState() {
  const [title, setTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function run() {
      try {
        const state = await getLatestState();
        const title = await formatPlayingState(state);

        setTitle(title);
        setLoading(false);
      } catch (error) {
        setTitle("🔇 No Sonos system detected");
        setLoading(false);
      }
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
  const [systemDetected, setSystemDetected] = useState<boolean>(true);

  useEffect(() => {
    async function run() {
      try {
        const groups = await getAvailableGroups();
        const activeGroup = await storage.getActiveGroup();

        setAvailableGroups(groups);
        setActiveGroup(activeGroup);
      } catch (error) {
        setSystemDetected(false);
      }
    }

    run();
  }, []);

  return {
    availableGroups: availableGroups,
    activeGroup,
    systemDetected,
  };
}
