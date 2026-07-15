import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { Preferences } from "./types";
import { SearchResult } from "./components/SearchResult";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const preferences: Preferences = getPreferenceValues();

  return <SearchResult preferences={preferences} searchText={searchText} onSearchTextChange={setSearchText} />;
}
