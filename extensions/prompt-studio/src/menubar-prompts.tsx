import { Clipboard, getPreferenceValues, Icon, launchCommand, LaunchType, MenuBarExtra, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { listPrompts, resolvePromptDirectory, type PromptRecord } from "./core/prompt-store";
import { extractPlaceholders } from "./core/placeholders";
import { browsePromptsLaunchContext } from "./core/launch-context";
import { loadPromptUsage, rankRecordsByUsage, recordPromptUse } from "./core/search-index";

const MENU_LIMIT = 5;

export default function MenubarPrompts() {
  const preferences = getPreferenceValues<Preferences.MenubarPrompts>();
  const [records, setRecords] = useState<PromptRecord[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const directory = resolvePromptDirectory(preferences.libraryDirectory);
        const library = await listPrompts(directory);
        const active = library.records.filter((record) => !record.archivedAt);
        setRecords(rankRecordsByUsage(active, loadPromptUsage()).slice(0, MENU_LIMIT));
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      }
    })();
  }, [preferences.libraryDirectory]);

  return (
    <MenuBarExtra
      icon={Icon.TextDocument}
      tooltip="Most-Used Prompts"
      isLoading={records === undefined && error === undefined}
    >
      {error ? (
        <MenuBarExtra.Item title="Prompt Library Unavailable" subtitle={error} />
      ) : records && records.length === 0 ? (
        <MenuBarExtra.Item title="No Prompts Saved Yet" />
      ) : (
        (records ?? []).map((record) => (
          <MenuBarExtra.Item
            key={record.id}
            title={record.title}
            onAction={async () => {
              if (extractPlaceholders(record.body).length > 0) {
                await launchCommand({
                  name: "browse-prompts",
                  type: LaunchType.UserInitiated,
                  context: browsePromptsLaunchContext(record.id),
                });
                await showHUD("Open the prompt to fill its placeholders");
                return;
              }
              await Clipboard.copy(record.body);
              try {
                recordPromptUse(record.id);
              } catch {
                // ponytail: a missing index only loses ranking, never the copy.
              }
              await showHUD("Prompt Copied");
            }}
          />
        ))
      )}
    </MenuBarExtra>
  );
}
