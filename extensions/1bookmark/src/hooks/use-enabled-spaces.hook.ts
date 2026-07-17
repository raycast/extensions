import { useCachedState } from "@raycast/utils";
import { CACHED_KEY_DISABLED_SPACE_IDS } from "../utils/constants.util";
import { useMe } from "./use-me.hook";
import { useCallback, useEffect, useMemo } from "react";
import { Alert } from "@raycast/api";
import { confirmAlert } from "@raycast/api";

export const useEnabledSpaces = () => {
  const me = useMe();

  const [disabledSpaceIds, setDisabledSpaceIds] = useCachedState<string[]>(CACHED_KEY_DISABLED_SPACE_IDS, []);

  const enabledSpaces = useMemo(() => {
    if (!me.data) return [];

    return me.data.associatedSpaces.filter((s) => !disabledSpaceIds.includes(s.id));
  }, [me.data, disabledSpaceIds]);

  const enabledSpaceIds = useMemo(() => enabledSpaces?.map((s) => s.id), [enabledSpaces]);

  useEffect(() => {
    if (!me.data) return;

    const userSpaceIds = me.data.associatedSpaces.map((s) => s.id);
    const updated = disabledSpaceIds.filter((id) => userSpaceIds.includes(id));
    if (updated.length !== disabledSpaceIds.length) {
      setDisabledSpaceIds(updated);
    }
  }, [me.data, disabledSpaceIds]);

  const confirmAndToggleEnableDisableSpace = useCallback(
    async (spaceId: string) => {
      const enabled = enabledSpaceIds?.includes(spaceId);
      const message = enabled
        ? "If you disable a space, bookmarks in this space will not be visible, and you can enable it again at any time."
        : "If you enable a space, bookmarks in this space will be visible.";

      const confirmed = await confirmAlert({
        title: enabled ? "Disable This Space?" : "Enable This Space?",
        message,
        primaryAction: {
          title: enabled ? "Disable" : "Enable",
          style: enabled ? Alert.ActionStyle.Destructive : Alert.ActionStyle.Default,
        },
      });

      if (!confirmed) return;

      setDisabledSpaceIds((prev) => {
        if (prev.includes(spaceId)) {
          return prev.filter((id) => id !== spaceId);
        }
        return [...prev, spaceId];
      });
    },
    [enabledSpaceIds, setDisabledSpaceIds],
  );

  const disableSpace = useCallback((spaceId: string) => {
    setDisabledSpaceIds((prev) => {
      if (prev.includes(spaceId)) {
        return prev;
      }
      return [...prev, spaceId];
    });
  }, []);

  return {
    enabledSpaces: me.data ? enabledSpaces : null,
    enabledSpaceIds: me.data ? enabledSpaceIds : null,
    confirmAndToggleEnableDisableSpace,
    refetch: me.refetch,
    disableSpace,
  };
};
