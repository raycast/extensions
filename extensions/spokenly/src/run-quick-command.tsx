import {
  Action,
  ActionPanel,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
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

export default function RunQuickCommand() {
  const [commands, setCommands] = useState<QuickCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    try {
      const raw = tryReadJSONPref<QuickCommand[]>("quickCommands") ?? [];
      const filtered = raw.filter(
        (qc) => qc && qc.id && qc.isEnabled !== false,
      );
      setCommands(filtered);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: "Could not read quick commands",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRun(qc: QuickCommand) {
    try {
      await openSpokenlyURL(buildStartURL(qc.id));
      await showHUD(`Running ${qc.name ?? "quick command"}`);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start quick command",
        message: err instanceof Error ? err.message : String(err),
      });
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
                  title="Copy Quick Command Id"
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
