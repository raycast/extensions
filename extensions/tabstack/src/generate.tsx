import { Action, ActionPanel, Detail, LaunchProps, Toast } from "@raycast/api";
import { getClient } from "./lib/tabstack";
import { useAsyncCommand } from "./lib/useAsyncCommand";

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    key_points: { type: "array", items: { type: "string" } },
    takeaways: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "key_points"],
} as const;

interface Analysis {
  title: string;
  summary: string;
  key_points: string[];
  takeaways: string[];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toAnalysis(data: Record<string, unknown>): Analysis {
  return {
    title: asString(data.title, "Analysis"),
    summary: asString(data.summary, ""),
    key_points: asStringArray(data.key_points),
    takeaways: asStringArray(data.takeaways),
  };
}

function formatMarkdown(analysis: Analysis): string {
  const parts: string[] = [`# ${analysis.title}`];
  if (analysis.summary) parts.push(analysis.summary);
  if (analysis.key_points.length > 0) {
    parts.push("## Key Points", analysis.key_points.map((point) => `- ${point}`).join("\n"));
  }
  if (analysis.takeaways.length > 0) {
    parts.push("## Takeaways", analysis.takeaways.map((item) => `- ${item}`).join("\n"));
  }
  return parts.join("\n\n");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Generate }>) {
  const { url, instructions } = props.arguments;

  const { markdown, isLoading } = useAsyncCommand(
    "Analyzing the page…",
    [url, instructions],
    { title: "Analyzing page…", message: url },
    "Analysis failed",
    async ({ isCancelled, toast, setMarkdown }) => {
      const result = await getClient().generate.json({
        url,
        json_schema: ANALYSIS_SCHEMA,
        instructions,
      });
      if (isCancelled()) return;
      setMarkdown(formatMarkdown(toAnalysis(result)));
      toast.style = Toast.Style.Success;
      toast.title = "Analysis ready";
    },
  );

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={url}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Analysis" content={markdown} />
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}
