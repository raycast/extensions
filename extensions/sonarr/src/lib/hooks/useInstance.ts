import { useCallback, useEffect, useMemo } from "react";
import { showFailureToast, useLocalStorage } from "@raycast/utils";
import type { InstanceState, SonarrInstance, SonarrInstanceId } from "@/lib/types/instance";
import { getPreferredInstanceId, getSonarrInstances } from "@/lib/utils/connection";

const ACTIVE_INSTANCE_KEY = "sonarr-active-instance";

interface StoredSelection {
  instanceId: SonarrInstanceId;
  /** The `Active Instance` preference this selection was recorded against. */
  preferredInstanceId: SonarrInstanceId;
}

/**
 * Resolves the instance every command talks to.
 *
 * The selection is stored rather than kept in component state, so switching
 * instances in one command carries over to the others and survives closing
 * Raycast. The `Active Instance` preference seeds it, and every change to that
 * preference wins over an earlier manual switch — otherwise the preference
 * would look broken to anyone who had ever used the switch action.
 *
 * Detecting "changed" is why the preference is stored alongside the selection
 * and re-recorded on mount: comparing against the value the last selection was
 * made under is what tells a real preference change apart from a preference
 * that merely happens to name the other instance.
 */
export function useInstance(): InstanceState {
  const instances = useMemo(() => getSonarrInstances(), []);
  const preferredInstanceId = useMemo(() => getPreferredInstanceId(), []);
  const {
    value: storedSelection,
    setValue: setStoredSelection,
    isLoading,
  } = useLocalStorage<StoredSelection>(ACTIVE_INSTANCE_KEY);

  const isSelectionCurrent = storedSelection?.preferredInstanceId === preferredInstanceId;

  useEffect(() => {
    if (isLoading || isSelectionCurrent) {
      return;
    }

    setStoredSelection({ instanceId: preferredInstanceId, preferredInstanceId }).catch((error) => {
      showFailureToast(error, { title: "Failed to store the active Sonarr instance" });
    });
  }, [isLoading, isSelectionCurrent, preferredInstanceId, setStoredSelection]);

  const instance = useMemo(() => {
    // Stay on `null` until the stored selection is known, so no request is ever
    // fired against the instance the user switched away from.
    if (isLoading) {
      return null;
    }

    const selectedId = isSelectionCurrent && storedSelection ? storedSelection.instanceId : preferredInstanceId;

    return instances.find((candidate) => candidate.id === selectedId) ?? instances[0] ?? null;
  }, [instances, storedSelection, isSelectionCurrent, preferredInstanceId, isLoading]);

  const switchToInstance = useCallback(
    (next: SonarrInstance) => {
      setStoredSelection({ instanceId: next.id, preferredInstanceId }).catch((error) => {
        showFailureToast(error, { title: `Failed to switch to ${next.name}` });
      });
    },
    [setStoredSelection, preferredInstanceId],
  );

  return { instance, instances, isLoading, switchToInstance };
}
