import React from "react";
import { useFavoriteMarkets } from "../hooks/use-favorite-markets";

type Context = ReturnType<typeof useFavoriteMarkets> & {
  showingDetail: boolean;
  setShowingDetail: (value: boolean) => void;
};

export const MarketsContext = React.createContext<Context | null>(null);
