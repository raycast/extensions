import Path from "node:path";
import { Action, ActionPanel, Detail, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { ParseBibTex } from "./Utils/parser";
import { isBibFile } from "./Utils/preferences";
import { describeError, showError } from "./Utils/errors";

import List from "./Local/List";

export default function Command() {
  const { bibfile, path } = getPreferenceValues<Preferences>();
  const validBibfile = isBibFile(bibfile);

  const {
    isLoading,
    data: entries = [],
    error,
    revalidate,
  } = usePromise(ParseBibTex, [bibfile], {
    execute: validBibfile,
    onError: (e) => showError(e, "Could not read the library"),
  });

  const settingsAction = <Action title="Open Extension Settings" icon={Icon.Cog} onAction={openExtensionPreferences} />;

  if (!validBibfile) {
    return (
      <Detail
        markdown={`**${Path.basename(bibfile)}** is not a \`.bib\` file. Select your BibTeX file in the extension settings.`}
        actions={<ActionPanel>{settingsAction}</ActionPanel>}
      />
    );
  }

  if (!isLoading && error) {
    return (
      <Detail
        markdown={`# Could not read the library\n\n\`${bibfile}\`\n\n${describeError(error)}`}
        actions={
          <ActionPanel>
            <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            {settingsAction}
          </ActionPanel>
        }
      />
    );
  }

  return <List bibfile={bibfile} path={path} isLoading={isLoading} entries={entries} loadEntries={revalidate} />;
}
