import { createContext, useEffect, useState } from "react";

import { ViewType } from "../types";
import { getPreferenceValues } from "@raycast/api";

type ViewTypeProps = {
  setViewType: (viewType: ViewType) => void;
  viewType: ViewType;
  setShowingDetails: (showingDetails: boolean) => void;
  showingDetails: boolean;
};

export const ViewTypeCtx = createContext<ViewTypeProps>({
  setViewType: () => {},
  viewType: "grid",
  setShowingDetails: () => {},
  showingDetails: false,
});

export function ViewTypeCtxProvider({ children }: { children: React.ReactNode }) {
  const preferences = getPreferenceValues();
  const defaultView = preferences.view as ViewType;

  const [viewType, setViewType] = useState<ViewType>(defaultView);
  const [showingDetails, setShowingDetails] = useState<boolean>(defaultView === "list-detailed");

  useEffect(() => {
    setShowingDetails(defaultView === "list-detailed");
  }, [viewType, defaultView]);

  return (
    <ViewTypeCtx.Provider value={{ setViewType, viewType, setShowingDetails, showingDetails }}>
      {children}
    </ViewTypeCtx.Provider>
  );
}
