import { Action, ActionPanel, Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { friendlyError, getClient } from "./lib/tabstack";

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
  const [markdown, setMarkdown] = useState("Analyzing the page…");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Analyzing page…", message: url });
      try {
        const result = await getClient().generate.json({
          url,
          json_schema: ANALYSIS_SCHEMA,
          instructions,
        });
        if (cancelled) return;
        setMarkdown(formatMarkdown(toAnalysis(result)));
        toast.style = Toast.Style.Success;
        toast.title = "Analysis ready";
      } catch (error) {
        if (cancelled) return;
        const message = friendlyError(error);
        setMarkdown(`## Analysis failed\n\n${message}`);
        toast.style = Toast.Style.Failure;
        toast.title = "Failed";
        toast.message = message;
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, instructions]);

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
