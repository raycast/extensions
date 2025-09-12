import { AI, showToast, Toast, Action, Icon, useNavigation, environment } from "@raycast/api";
import { SavedWorkflow, WorkflowError } from "../types";
import AISummaryView from "./AISummaryView";
import { showFailureToast } from "@raycast/utils";

export async function generateAIErrorSummary(errors: WorkflowError[], prompt: string): Promise<string> {
  try {
    if (errors.length === 0) {
      return "No recent errors found for this workflow. The workflow appears to be running smoothly.";
    }

    // Format error data for AI analysis
    const errorLogs = errors
      .map((error) => {
        const timestamp = new Date(error.indexed_at_ms).toISOString();
        const errorMessage = error.event?.error?.msg || "Unknown error";
        return `[${timestamp}] ${errorMessage}`;
      })
      .join("\n");

    const fullPrompt = `${prompt}\n\nError logs (last ${errors.length} errors):\n${errorLogs}`;

    if (!environment.canAccess(AI)) {
      throw new Error("AI is not available in this environment.");
    }
    const summary = await AI.ask(fullPrompt, {
      creativity: "medium",
    });

    return summary;
  } catch (error) {
    throw new Error(`Failed to generate AI summary: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function AIErrorSummaryAction({ workflow }: { workflow: SavedWorkflow }) {
  const { push } = useNavigation();

  const handleGenerateSummary = async () => {
    try {
      showToast({
        title: "Generating AI Summary",
        message: "Opening AI analysis view...",
        style: Toast.Style.Animated,
      });

      // Navigate to the AI summary view
      push(<AISummaryView workflow={workflow} />);
    } catch (error) {
      showFailureToast(error, { title: "Error generating AI summary" });
    }
  };

  return (
    <Action
      title="AI Error Summary"
      icon={Icon.BarChart}
      onAction={handleGenerateSummary}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
    />
  );
}

export function AIErrorSummaryItem({ workflow }: { workflow: SavedWorkflow }) {
  const { push } = useNavigation();

  const handleGenerateSummary = async () => {
    try {
      showToast({
        title: "Generating AI Summary",
        message: "Opening AI analysis view...",
        style: Toast.Style.Animated,
      });

      // Navigate to the AI summary view
      push(<AISummaryView workflow={workflow} />);
    } catch (error) {
      showFailureToast(error, { title: "Error generating AI summary" });
    }
  };

  return {
    title: "AI Error Summary",
    subtitle: "Generate AI-powered analysis of error logs",
    icon: Icon.BarChart,
    actions: <Action title="Generate AI Summary" icon={Icon.BarChart} onAction={handleGenerateSummary} />,
  };
}
