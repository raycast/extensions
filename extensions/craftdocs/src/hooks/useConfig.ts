import { useEffect, useState } from "react";
import {
  buildCraftConfig,
  CraftConfig,
  CraftConfigSnapshot,
  loadCraftConfigSnapshot,
  toggleSpaceEnabled,
  updateSpaceCustomName,
} from "../Config";
import { UseCraftEnvironment } from "./useCraftEnvironment";

export type UseConfig = {
  configLoading: boolean;
  config: CraftConfig | null;
  refreshConfig: () => void;
  setSpaceCustomName: (spaceID: string, customName: string | null) => void;
  toggleSpaceEnabled: (spaceID: string) => void;
};

type ConfigState = {
  configLoading: boolean;
  config: CraftConfig | null;
  snapshot: CraftConfigSnapshot | null;
};

export default function useConfig({ environmentLoading, environment }: UseCraftEnvironment): UseConfig {
  const [state, setState] = useState<ConfigState>({
    configLoading: true,
    config: null,
    snapshot: null,
  });

  const loadConfig = () => {
    if (environmentLoading) {
      return;
    }

    if (!environment || environment.status !== "ready") {
      setState({
        configLoading: false,
        config: null,
        snapshot: null,
      });
      return;
    }

    const snapshot = loadCraftConfigSnapshot(environment);
    setState({
      configLoading: false,
      snapshot,
      config: buildCraftConfig(snapshot),
    });
  };

  const applySnapshotUpdate = (updater: (snapshot: CraftConfigSnapshot) => CraftConfigSnapshot) => {
    setState((previousState) => {
      if (!previousState.snapshot) {
        return previousState;
      }

      const nextSnapshot = updater(previousState.snapshot);

      return {
        configLoading: false,
        snapshot: nextSnapshot,
        config: buildCraftConfig(nextSnapshot),
      };
    });
  };

  useEffect(() => {
    loadConfig();
  }, [environmentLoading, environment]);

  return {
    configLoading: state.configLoading,
    config: state.config,
    refreshConfig: loadConfig,
    setSpaceCustomName: (spaceID, customName) =>
      applySnapshotUpdate((snapshot) => updateSpaceCustomName(snapshot, spaceID, customName)),
    toggleSpaceEnabled: (spaceID) => applySnapshotUpdate((snapshot) => toggleSpaceEnabled(snapshot, spaceID)),
  };
}
