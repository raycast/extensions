import Path from "node:path";
import { useState, useEffect, useCallback } from "react";
import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

import { ILocalEntry } from "./Utils/types";
import { ParseBibTex } from "./Utils/parser";
import { isBibFile } from "./Utils/preferences";

import List from "./Local/List";

export default function Command() {
  const [entries, setEntries] = useState<ILocalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { bibfile, path } = getPreferenceValues<Preferences>();
  const validBibfile = isBibFile(bibfile);

  const loadEntries = useCallback(async () => {
    if (!validBibfile) {
      return;
    }
    setIsLoading(true);
    try {
      const parsedEntries = await ParseBibTex(bibfile);
      setEntries(parsedEntries);
    } finally {
      setIsLoading(false);
    }
  }, [bibfile, validBibfile]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  if (!validBibfile) {
    return (
      <Detail
        markdown={`**${Path.basename(bibfile)}** is not a \`.bib\` file. Select your BibTeX file in the extension settings.`}
        actions={
          <ActionPanel>
            <Action title="Open Extension Settings" icon={Icon.Cog} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return <List bibfile={bibfile} path={path} isLoading={isLoading} entries={entries} loadEntries={loadEntries} />;
}
