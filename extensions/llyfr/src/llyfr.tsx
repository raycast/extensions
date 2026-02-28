import { useState, useEffect, useCallback } from "react";
import { getPreferenceValues } from "@raycast/api";

import { ILocalEntry } from "./Utils/types";
import { ParseBibTex } from "./Utils/parser";
import { ValidatePreferences } from "./Local/Preferences";

import List from "./Local/List";

export default function Command() {
  const [entries, setEntries] = useState<ILocalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const preferences = getPreferenceValues<Preferences>();

  const validation = ValidatePreferences(preferences);
  if (!validation.status) {
    return validation.component;
  } else {
    const bibfile = validation.bibfile;
    const path = validation.path;

    const loadEntries = useCallback(async () => {
      setIsLoading(true);
      try {
        const parsedEntries = await ParseBibTex(bibfile);
        setEntries(parsedEntries);
      } finally {
        setIsLoading(false);
      }
    }, [bibfile]);

    useEffect(() => {
      loadEntries();
    }, [loadEntries]);

    return <List bibfile={bibfile} path={path} isLoading={isLoading} entries={entries} loadEntries={loadEntries} />;
  }
}
