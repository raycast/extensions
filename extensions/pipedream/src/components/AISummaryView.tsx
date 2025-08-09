import { useState } from "react";
import { Detail, ActionPanel, Action, showToast, Toast, useNavigation, Icon, Clipboard } from "@raycast/api";
import { generateAIErrorSummary } from "./AIErrorSummary";
import { useUserInfo } from "../hooks/useUserInfo";
import { SavedWorkflow, WorkflowError } from "../types";
import { fetchWorkflowErrors } from "../services/api";
import { showFailureToast } from "@raycast/utils";

interface AISummaryViewProps {
  workflow: SavedWorkflow;
}

export default function AISummaryView({ workflow }: AISummaryViewProps) {
  const { orgId } = useUserInfo();
  const { push } = useNavigation();
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getOptimizedPrompt = (): string => {
    return `You are an expert workflow analyst. Analyze the following error logs from a Pipedream workflow and provide a concise, actionable summary.

Please structure your response with these sections:
## Error Summary
- Brief overview of the main issues

## Common Patterns
- Identify recurring error types or patterns

## Root Causes
- Analyze the underlying causes

## Recommendations
- Provide specific, actionable steps to resolve issues

## Helpful Links
- Add relevant Pipedream documentation links based on error types

Keep the response concise, well-formatted with markdown, and focus on practical insights that help resolve the workflow issues.`;
  };

  // Generate relevant links based on error types
  function generateRelevantLinks(errors: WorkflowError[]): string {
    const errorMessages = errors
      .map((e) => e.event?.error?.msg || "")
      .join(" ")
      .toLowerCase();

    const links: string[] = [];

    if (errorMessages.includes("api") || errorMessages.includes("http")) {
      links.push("[API Integration Guide](https://pipedream.com/docs/api)");
    }

    if (errorMessages.includes("auth") || errorMessages.includes("authentication")) {
      links.push("[Authentication Setup](https://pipedream.com/docs/auth)");
    }

    if (errorMessages.includes("trigger") || errorMessages.includes("event")) {
      links.push("[Trigger Configuration](https://pipedream.com/docs/triggers)");
    }

    if (errorMessages.includes("step") || errorMessages.includes("action")) {
      links.push("[Step Configuration](https://pipedream.com/docs/steps)");
    }

    return links.map((link) => `- ${link}`).join("\n");
  }

  // Post-process AI output to fix bullet formatting
  function postProcessBullets(text: string): string {
    // First, normalize all headers to ## format
    let processed = text.replace(/^#{1,6}\s+/gm, "## ");

    // Replace any bullet characters with "- "
    processed = processed.replace(/^[*•·◦‣⁃]\s*/gm, "- ");
    processed = processed.replace(/^[-]\s*/gm, "- ");

    // Remove any extra spaces before bullets
    processed = processed.replace(/^\s+- /gm, "- ");

    // Ensure proper spacing: header followed by blank line, then bullets
    processed = processed.replace(/(## [^\n]+)\n(- )/g, "$1\n\n$2");

    // Remove extra blank lines between bullets
    processed = processed.replace(/\n\n(- )/g, "\n$1");

    // Ensure bullets are properly aligned (no extra spaces)
    processed = processed.replace(/^- \s+/gm, "- ");

    // Limit bullets per section to 3-4 max
    processed = processed.replace(/(## [^\n]+\n)((- [^\n]+\n?){4,})/g, (_match, header, bullets) => {
      const lines = bullets.trim().split("\n").filter(Boolean);
      return header + "\n" + lines.slice(0, 4).join("\n") + "\n";
    });

    // Clean up any remaining formatting issues
    processed = processed.replace(/\n{3,}/g, "\n\n");
    processed = processed.replace(/\s+$/gm, "");

    return processed;
  }

  const handleGenerateSummary = async () => {
    if (!orgId) {
      showFailureToast("Organization ID not available");
      return;
    }

    setIsGenerating(true);
    showToast({ title: "Generating AI Summary", message: "Please wait...", style: Toast.Style.Animated });
    try {
      const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
      if (!errorResponse.data || errorResponse.data.length === 0) {
        showFailureToast("No errors found to analyze");
        setIsGenerating(false);
        return;
      }
      const recentErrors = errorResponse.data.slice(0, 100);
      let aiSummary = await generateAIErrorSummary(recentErrors, getOptimizedPrompt());

      // Add relevant links based on error analysis
      const relevantLinks = generateRelevantLinks(recentErrors);
      aiSummary = aiSummary.replace(/## Helpful Links[\s\S]*?(?=##|$)/, `## Helpful Links\n\n${relevantLinks}`);

      const processedSummary = postProcessBullets(aiSummary);
      setSummary(processedSummary);
      showToast(Toast.Style.Success, "AI Summary Generated");
    } catch (error) {
      showFailureToast(error, { title: "Failed to generate summary" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopySummary = async () => {
    if (summary) {
      await Clipboard.copy(summary);
      showToast(Toast.Style.Success, "Summary copied to clipboard");
    }
  };

  const handleViewRawLogs = async () => {
    if (!orgId) {
      showFailureToast("Organization ID not available");
      return;
    }
    try {
      const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
      if (!errorResponse.data || errorResponse.data.length === 0) {
        showFailureToast("No errors found");
        return;
      }
      push(<RawLogsView workflow={workflow} errors={errorResponse.data} />);
    } catch (error) {
      showFailureToast(error, { title: "Failed to fetch raw logs" });
    }
  };

  const markdown = summary || "Click 'Generate AI Summary' to analyze workflow errors.";

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workflow" text={workflow.customName} />
          <Detail.Metadata.Label title="Workflow ID" text={workflow.id} />
          <Detail.Metadata.Label title="Folder" text={workflow.folder || "Root"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Status"
            text={isGenerating ? "Generating..." : summary ? "Complete" : "Ready"}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Generate AI Summary"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={handleGenerateSummary}
          />
          {summary && (
            <>
              <Action
                title="Copy Summary"
                icon={Icon.CopyClipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                onAction={handleCopySummary}
              />
              <Action title="Regenerate" icon={Icon.ArrowClockwise} onAction={handleGenerateSummary} />
            </>
          )}
          <Action
            title="View Raw Error Logs"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleViewRawLogs}
          />
        </ActionPanel>
      }
    />
  );
}

// Raw Logs View Component
interface RawLogsViewProps {
  workflow: SavedWorkflow;
  errors: WorkflowError[];
}

function RawLogsView({ workflow, errors }: RawLogsViewProps) {
  const { push } = useNavigation();
  const formatError = (error: WorkflowError) => {
    const timestamp = error.indexed_at_ms ? new Date(error.indexed_at_ms).toISOString() : "Unknown time";
    const message = error.event?.error?.msg || "No message";
    return `**${timestamp}**\n\`\`\`\n${message}\n\`\`\`\n\n`;
  };
  const rawLogsMarkdown =
    errors.length > 0
      ? `# Raw Error Logs for ${workflow.customName}\n\n${errors.map(formatError).join("")}`
      : "No errors found.";
  return (
    <Detail
      markdown={rawLogsMarkdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workflow" text={workflow.customName} />
          <Detail.Metadata.Label title="Total Errors" text={errors.length.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Back to AI Summary"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            onAction={() => push(<AISummaryView workflow={workflow} />)}
          />
        </ActionPanel>
      }
    />
  );
}
