import { useCachedState } from "@raycast/utils";
import { useCallback, useMemo } from "react";

import { PopIconCategory } from "../helpers/get-popicon-categories";
import { Popicon } from "../schemas/popicon";

function useNewPopicons(): readonly [PopIconCategory | undefined, (newIcons: Array<Popicon>) => void] {
  const [newIconsState, setNewIconsState] = useCachedState<PopIconCategory & { timestamp: Date }>("new-icons");

  const newIcons = useMemo(() => {
    if (!newIconsState) {
      return undefined;
    }

    if (new Date().getTime() - newIconsState.timestamp.getTime() > 1000 * 60 * 60 * 24 * 7) {
      return undefined;
    }

    return {
      title: newIconsState.title,
      keywords: newIconsState.keywords,
      icons: newIconsState.icons.map((i) => ({ ...i, name: `${i.name} ` })),
    } satisfies PopIconCategory;
  }, [newIconsState]);

  const setNewIcons = useCallback(
    (newIcons: Array<Popicon>) => {
      setNewIconsState({
        title: "New",
        icons: newIcons,
        keywords: [],
        timestamp: new Date(),
      });
    },
    [setNewIconsState]
  );

  return [newIcons, setNewIcons] as const;
}

export { useNewPopicons };
