import { ActionViewState } from "@/views/action/action-view";
import { environment } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo } from "react";

export const useActionState = (guid?: string) => {
  const [state, setState] = useCachedState<ActionViewState>(
    `${guid ?? environment.extensionName}-action-view-state`,
    "Data",
  );

  return useMemo(() => ({ state, setState }), [state, setState]);
};
