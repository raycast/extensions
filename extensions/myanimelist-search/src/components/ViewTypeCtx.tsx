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

  const [chosenView, setChosenView] = useState<ViewType>(defaultView);
  const [showingDetails, setShowingDetail] = useState<boolean>(defaultView === "list-detailed");

  useEffect(() => {
    setShowingDetail(defaultView === "list-detailed");
  }, [chosenView]);

  return (
    <ViewTypeCtx.Provider
      value={{ setViewType: setChosenView, viewType: chosenView, setShowingDetails: setShowingDetail, showingDetails }}
    >
      {children}
    </ViewTypeCtx.Provider>
  );
}
