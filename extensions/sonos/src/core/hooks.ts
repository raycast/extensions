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
        setTitle(formatPlayingState(state));
      } catch (error) {
        console.error(`[sonos] useCurrentState: state fetch failed:`, error);
        setTitle("🔇 No Sonos system detected");
      } finally {
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
  const [detectionError, setDetectionError] = useState<unknown>();

  useEffect(() => {
    async function run() {
      try {
        const groups = await getAvailableGroups();
        const activeGroup = await storage.getActiveGroup();

        setAvailableGroups(groups);
        setActiveGroup(activeGroup);
      } catch (error) {
        console.error(`[sonos] useSonos: system detection failed:`, error);
        setDetectionError(error);
      }
    }

    run();
  }, []);

  return {
    availableGroups: availableGroups,
    activeGroup,
    systemDetected: detectionError === undefined,
    detectionError,
  };
}
