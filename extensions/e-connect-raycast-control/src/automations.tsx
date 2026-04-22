import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";

import { fetchAutomations, getWebUiBaseUrl, updateAutomationEnabledState } from "./econnect";
import type { AutomationResponse } from "./types";
import { ConnectionErrorView } from "./ui";

function formatSchedule(automation: AutomationResponse) {
  if (automation.schedule_type?.trim()) {
    return automation.schedule_type;
  }
  if (automation.next_run_at) {
    return `Next run ${new Date(automation.next_run_at).toLocaleString()}`;
  }
  return "Manual";
}

function formatLastExecution(automation: AutomationResponse) {
  if (!automation.last_execution) {
    return automation.is_enabled ? "Never triggered" : "Stopped";
  }

  const prefix = automation.last_execution.status === "success" ? "Last run succeeded" : "Last run failed";
  return `${prefix} · ${new Date(automation.last_execution.triggered_at).toLocaleString()}`;
}

function getAutomationIcon(automation: AutomationResponse) {
  if (automation.is_enabled) {
    return { source: Icon.Play, tintColor: Color.Green };
  }

  return { source: Icon.Pause, tintColor: Color.Yellow };
}

export default function Command() {
  const [automations, setAutomations] = useState<AutomationResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextAutomations = await fetchAutomations();
      setAutomations(nextAutomations);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load automations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleAutomation = useCallback(
    async (automation: AutomationResponse) => {
      const nextEnabled = !automation.is_enabled;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: nextEnabled ? "Running automation" : "Stopping automation",
        message: automation.name,
      });

      try {
        const updated = await updateAutomationEnabledState(automation, nextEnabled);
        toast.style = Toast.Style.Success;
        toast.title = updated.is_enabled ? "Automation running" : "Automation stopped";
        toast.message = updated.is_enabled ? "The automation is now enabled." : "The automation is now stopped and moved to the Stopped section.";
        await load();
      } catch (toggleError) {
        toast.style = Toast.Style.Failure;
        toast.title = nextEnabled ? "Failed to run automation" : "Failed to stop automation";
        toast.message = toggleError instanceof Error ? toggleError.message : "The request did not complete.";
      }
    },
    [load],
  );

  if (error && automations.length === 0) {
    return <ConnectionErrorView title="Unable to load automations" message={error} />;
  }

  const webUiBaseUrl = getWebUiBaseUrl();
  const runningAutomations = automations.filter((automation) => automation.is_enabled);
  const stoppedAutomations = automations.filter((automation) => !automation.is_enabled);

  const renderAutomationItem = (automation: AutomationResponse) => {
    const automationUrl = `${webUiBaseUrl}/automation/${automation.id}`;

    return (
      <List.Item
        key={automation.id}
        title={automation.name}
        subtitle={formatSchedule(automation)}
        icon={getAutomationIcon(automation)}
        accessories={[{ text: formatLastExecution(automation) }]}
        actions={
          <ActionPanel>
            <Action
              title={automation.is_enabled ? "Stop Automation" : "Run Automation"}
              icon={automation.is_enabled ? Icon.Pause : Icon.Play}
              onAction={() => toggleAutomation(automation)}
            />
            <Action.OpenInBrowser title="Open Automation in Web UI" url={automationUrl} />
            <Action.CopyToClipboard title="Copy Automation ID" content={String(automation.id)} />
            <Action title="Refresh Automations" icon={Icon.ArrowClockwise} onAction={load} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search automations">
      {runningAutomations.length > 0 ? (
        <List.Section title="Running">{runningAutomations.map(renderAutomationItem)}</List.Section>
      ) : null}
      {stoppedAutomations.length > 0 ? (
        <List.Section title="Stopped">{stoppedAutomations.map(renderAutomationItem)}</List.Section>
      ) : null}
    </List>
  );
}
