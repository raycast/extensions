import { MenuBarExtra, showToast, Toast, Icon, open as openInBrowser, getPreferenceValues, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRecentWorkflowRuns } from "./utils/github";
import { formatDistanceToNow } from "date-fns";

type WorkflowRun = {
  id: number;
  name: string | null;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
  repository: string;
  display_title: string;
};

interface Preferences {
  showAccount: boolean;
}

export default function Command() {
  const { showAccount } = getPreferenceValues<Preferences>();
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  function getStatusIcon(status: string, conclusion: string | null) {
    if (status === "completed") {
      switch (conclusion) {
        case "success":
          return { source: Icon.CheckCircle, tintColor: Color.Green };
        case "failure":
          return { source: Icon.XMarkCircle, tintColor: Color.Red };
        case "cancelled":
          return { source: Icon.Circle, tintColor: Color.SecondaryText };
        default:
          return { source: Icon.Circle, tintColor: Color.Blue };
      }
    }
    return { source: Icon.CircleProgress, tintColor: Color.Blue };
  }

  function getMenuBarIcon(runs: WorkflowRun[]) {
    if (runs.length === 0) return "github-actions-icon.png";

    if (runs.some((run) => run.status === "in_progress" || run.status === "queued")) {
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    }

    if (runs.some((run) => run.conclusion === "failure")) {
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    }

    if (runs.every((run) => run.conclusion === "success")) {
      return { source: Icon.CheckCircle, tintColor: Color.Green };
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
        const workflowRuns = await getRecentWorkflowRuns();
        setRuns(workflowRuns);
      } catch (error) {
        console.error("Failed to fetch workflow runs:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch workflow runs",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchRuns();
  }, []);

  return (
    <MenuBarExtra icon={getMenuBarIcon(runs)} isLoading={isLoading} tooltip="GitHub Actions">
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
