import React from "react";
import { Layout } from "./types/types";
import { SearchPinsList } from "./components/search-pins-list";
import { SearchPinsGrid } from "./components/search-pins-grid";
import { layout } from "./types/preferences";

export default function SearchPins() {
  return layout === Layout.LIST ? <SearchPinsList /> : <SearchPinsGrid />;
}
