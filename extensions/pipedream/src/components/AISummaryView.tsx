import { useState } from "react";
import { Detail, ActionPanel, Action, Icon, showToast, Toast, Clipboard, useNavigation } from "@raycast/api";
import { generateAIErrorSummary } from "./AIErrorSummary";
import { useUserInfo } from "../hooks/useUserInfo";
import { SavedWorkflow, WorkflowError } from "../types";
import { fetchWorkflowErrors } from "../services/api";
import { WorkflowAnalyticsView } from "../workflow-analytics";

interface AISummaryViewProps {
  workflow: SavedWorkflow;
}

export default function AISummaryView({ workflow }: AISummaryViewProps) {
  const { orgId } = useUserInfo();
  const { push } = useNavigation();
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getOptimizedPrompt = (): string => {
    return `Analyze these Pipedream workflow errors and provide a clear, actionable summary.

**CRITICAL: Only use the actual error data provided. Do NOT guess, assume, or make up information. Do NOT search the web or use external knowledge.**

**IMPORTANT: Use EXACTLY this format:**

## Key Issues
- Point 1 (max 12 words, based ONLY on actual errors)
- Point 2 (max 12 words, based ONLY on actual errors)
- Point 3 (max 12 words, based ONLY on actual errors)

## Error Patterns
- Pattern 1 (max 12 words, from actual error data)
- Pattern 2 (max 12 words, from actual error data)

## Recommended Actions
- Action 1 (max 12 words, based on specific error types found)
- Action 2 (max 12 words, based on specific error types found)
- Action 3 (max 12 words, based on specific error types found)

## Helpful Links
- [Pipedream Documentation](https://pipedream.com/docs)
- [Troubleshooting Guide](https://pipedream.com/docs/troubleshooting)

**RULES:**
1. Only analyze the provided error logs
2. Do not make assumptions about causes not mentioned in the logs
3. Keep each bullet point under 12 words
4. Use clear, actionable language
5. Focus on patterns you can actually see in the data
6. If no clear patterns emerge, say "No clear patterns detected in the provided logs"`;
  };

  // Generate relevant links based on error types
  function generateRelevantLinks(errors: WorkflowError[]): string {
    const links = [
      "[Pipedream Documentation](https://pipedream.com/docs)",
      "[Error Troubleshooting Guide](https://pipedream.com/docs/errors)",
      "[Workflow Debugging](https://pipedream.com/docs/debugging)",
    ];

    // Analyze errors for specific types and add relevant links
    const errorMessages = errors.map((e) => e.event?.error?.msg?.toLowerCase() || "").join(" ");

    if (errorMessages.includes("rate limit") || errorMessages.includes("429")) {
      links.push("[Rate Limiting Guide](https://pipedream.com/docs/rate-limits)");
    }

    if (errorMessages.includes("authentication") || errorMessages.includes("401") || errorMessages.includes("403")) {
      links.push("[Authentication Setup](https://pipedream.com/docs/authentication)");
    }

    if (errorMessages.includes("timeout") || errorMessages.includes("408")) {
      links.push("[Timeout Configuration](https://pipedream.com/docs/timeouts)");
    }

    if (errorMessages.includes("api") || errorMessages.includes("http")) {
      links.push("[HTTP Request Errors](https://pipedream.com/docs/http-errors)");
    }

    if (errorMessages.includes("webhook") || errorMessages.includes("hook")) {
      links.push("[Webhook Configuration](https://pipedream.com/docs/webhooks)");
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
    processed = processed.replace(/(## [^\n]+\n)((- [^\n]+\n?){4,})/g, (match, header, bullets) => {
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
      showToast(Toast.Style.Failure, "Organization ID not available");
      return;
    }

    setIsGenerating(true);
    try {
      const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
      if (!errorResponse.data || errorResponse.data.length === 0) {
        showToast(Toast.Style.Failure, "No errors found to analyze");
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
      showToast(
        Toast.Style.Failure,
        "Failed to generate summary",
        error instanceof Error ? error.message : "Unknown error",
      );
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
      showToast(Toast.Style.Failure, "Organization ID not available");
      return;
    }
    try {
      const errorResponse = await fetchWorkflowErrors(workflow.id, orgId);
      if (!errorResponse.data || errorResponse.data.length === 0) {
        showToast(Toast.Style.Failure, "No errors found");
        return;
      }
      push(<RawLogsView workflow={workflow} errors={errorResponse.data} />);
    } catch (error) {
      showToast(
        Toast.Style.Failure,
        "Failed to fetch raw logs",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  const markdown = summary || "Click 'Generate AI Summary' to analyze workflow errors.";

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Workflow" text={workflow.customName} />
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
          <Action
            title="Back to Workflow"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
            onAction={() => push(<WorkflowAnalyticsView workflow={workflow} errors={[]} />)}
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
