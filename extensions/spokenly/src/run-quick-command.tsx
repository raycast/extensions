import { Action, ActionPanel, Icon, List, showHUD } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { tryReadJSONPref } from "./lib/plist";
import { buildStartURL, openSpokenlyURL } from "./lib/urls";

interface QuickCommand {
  id: string;
  name?: string;
  isEnabled?: boolean;
  triggerPhrases?: string[];
  description?: string;
  prompt?: string;
}

async function loadQuickCommands(): Promise<QuickCommand[]> {
  const raw = tryReadJSONPref<QuickCommand[]>("quickCommands") ?? [];
  return raw.filter((qc) => qc && qc.id && qc.isEnabled !== false);
}

export default function RunQuickCommand() {
  const { isLoading, data: commands = [] } = useCachedPromise(
    loadQuickCommands,
    [],
    {
      initialData: [],
      failureToastOptions: { title: "Could not read quick commands" },
    },
  );

  async function handleRun(qc: QuickCommand) {
    try {
      await openSpokenlyURL(buildStartURL(qc.id));
      await showHUD(`Running ${qc.name ?? "quick command"}`);
    } catch (err) {
      await showFailureToast(err, { title: "Failed to start quick command" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search quick commands...">
      {commands.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No Quick Commands"
          description="Add Quick Commands in Spokenly → Settings, then come back."
          icon={Icon.Microphone}
        />
      ) : (
        commands.map((qc) => (
          <List.Item
            key={qc.id}
            title={qc.name ?? qc.id}
            subtitle={qc.description}
            accessories={
              qc.triggerPhrases && qc.triggerPhrases.length > 0
                ? [{ text: qc.triggerPhrases.join(", ") }]
                : []
            }
            actions={
              <ActionPanel>
                <Action
                  title="Run Quick Command"
                  icon={Icon.Play}
                  onAction={() => handleRun(qc)}
                />
                <Action.CopyToClipboard
                  title="Copy Quick Command ID"
                  content={qc.id}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
