import { MenuBarExtra, Icon, open as openInBrowser, getPreferenceValues, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRecentWorkflowRuns } from "./utils/github";
import { formatDistanceToNow } from "date-fns";
import { WorkflowRun } from "./types";
import { SCREENSHOT_RUNS } from "./utils/screenshot-data";

interface Preferences {
  showAccount: boolean;
  screenshotMode?: boolean;
}

const ENABLE_SCREENSHOT_MODE = false;

export default function Command() {
  const { showAccount } = getPreferenceValues<Preferences>();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function getStatusIcon(status: string | undefined, conclusion: string | null) {
    if (!status) return { source: Icon.XMarkCircle, tintColor: Color.Red };

    switch (status.toLowerCase()) {
      case "completed":
        switch (conclusion) {
          case "success":
            return { source: Icon.CheckCircle, tintColor: Color.Green };
          case "failure":
            return { source: Icon.XMarkCircle, tintColor: Color.Red };
          case "cancelled":
            return { source: Icon.Circle, tintColor: Color.SecondaryText };
          case "skipped":
            return { source: Icon.Circle, tintColor: Color.Yellow };
          default:
            return { source: Icon.Circle, tintColor: Color.Blue };
        }
      case "in_progress":
        return { source: Icon.CircleProgress, tintColor: Color.Blue };
      case "queued":
        return { source: Icon.Circle, tintColor: Color.SecondaryText };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    }
  }

  function getMenuBarIcon(runs: WorkflowRun[]) {
    if (runs.length === 0) return "github-actions-icon.png";

    if (runs.some((run) => run.status === "in_progress" || run.status === "queued")) {
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    }

    const allCompleted = runs.every((run) => run.status === "completed");
    if (allCompleted) {
      if (runs.some((run) => run.conclusion === "failure")) {
        return { source: Icon.XMarkCircle, tintColor: Color.Red };
      }

      if (runs.every((run) => run.conclusion === "success" || run.conclusion === "skipped")) {
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      }
    }

    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }

  function formatRepository(fullName: string) {
    if (showAccount) return fullName;
    return fullName.split("/")[1];
  }

  useEffect(() => {
    async function fetchRuns() {
      try {
        if (ENABLE_SCREENSHOT_MODE) {
          setRuns(SCREENSHOT_RUNS);
          setIsLoading(false);
          return;
        }

        const workflowRuns = await getRecentWorkflowRuns();
        setRuns(workflowRuns.filter((run): run is WorkflowRun => run !== null));
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRuns();
  }, []);

  if (error) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} isLoading={isLoading} tooltip="GitHub Workflows">
        <MenuBarExtra.Item title={error} />
      </MenuBarExtra>
    );
  }

  return (
    <MenuBarExtra icon={getMenuBarIcon(runs)} isLoading={isLoading} tooltip="GitHub Workflows">
      {runs.length > 0 ? (
        runs.map((run) => (
          <MenuBarExtra.Item
            key={run.id}
            title={formatRepository(run.repository)}
            icon={getStatusIcon(run.status, run.conclusion)}
            subtitle={`${run.name || run.display_title} • ${formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}`}
            onAction={() => openInBrowser(run.html_url)}
          />
        ))
      ) : (
        <MenuBarExtra.Item title={isLoading ? "Loading..." : "No recent workflow runs"} />
      )}
    </MenuBarExtra>
  );
}
