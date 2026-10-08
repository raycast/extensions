import { useCallback, useEffect, useState } from "react";
import { nanoid } from "nanoid";
import { LocalStorage } from "@raycast/api";
import { Portal, PortalType } from "./types";
import { CreatePortalForm } from "./components";

type State = {
  portals: Portal[];
};

export default function Command() {
  const [state, setState] = useState<State>({
    portals: [],
  });

  useEffect(() => {
    (async () => {
      const storedPortals = await LocalStorage.getItem<string>("portals");

      if (!storedPortals) {
        setState((previous) => ({ ...previous }));
        return;
      }

      try {
        const portals: Portal[] = JSON.parse(storedPortals);
        setState((previous) => ({ ...previous, portals }));
      } catch (e) {
        // can't decode portals
        setState((previous) => ({ ...previous, portals: [] }));
      }
    })();
  }, []);

  useEffect(() => {
    LocalStorage.setItem("portals", JSON.stringify(state.portals));
  }, [state.portals]);

  const handleCreate = useCallback(
    (portalName: string, portalId: string, portalType: PortalType) => {
      const newPortals = [
        ...state.portals,
        { id: nanoid(), portalName: portalName, portalId: portalId, portalType: portalType },
      ];
      setState((previous) => ({ ...previous, portals: newPortals }));
    },
    [state.portals, setState]
  );
  return <CreatePortalForm onCreate={handleCreate} />;
}
