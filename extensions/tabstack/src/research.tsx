import { Action, ActionPanel, Detail, LaunchProps, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { friendlyError, getClient } from "./lib/tabstack";

export default function Command(props: LaunchProps<{ arguments: Arguments.Research }>) {
  const { query } = props.arguments;
  const { researchMode } = getPreferenceValues<Preferences.Research>();
  const mode = researchMode === "balanced" ? "balanced" : "fast";

  const [markdown, setMarkdown] = useState(`# Researching\n\n> ${query}\n\nStarting…`);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const log: string[] = [`# Researching\n\n> ${query}`];
    const render = () => setMarkdown(log.join("\n\n"));

    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Researching…", message: query });
      try {
        const stream = await getClient().agent.research({ query, mode });
        for await (const event of stream) {
          if (cancelled) break;
          switch (event.event) {
            case "start":
            case "planning:start":
            case "planning:end":
            case "searching:start":
            case "searching:end":
            case "writing:start":
            case "writing:end":
              log.push(event.data.message);
              render();
              break;
            case "iteration:start":
              log.push(`**Iteration ${event.data.iteration} of ${event.data.maxIterations}** — ${event.data.message}`);
              if (event.data.queries.length > 0) {
                log.push(event.data.queries.map((q) => `- ${q}`).join("\n"));
              }
              render();
              break;
            case "iteration:end":
              log.push(event.data.message + (event.data.stopReason ? ` (${event.data.stopReason})` : ""));
              render();
              break;
            case "complete": {
              log.length = 0;
              log.push(event.data.report);
              const sources = event.data.metadata.citedPages ?? [];
              if (sources.length > 0) {
                log.push("## Sources");
                log.push(
                  sources
                    .map((page, i) => {
                      const label = page.title && page.title.length > 0 ? page.title : page.url;
                      const tags = [
                        page.relevance && `relevance: ${page.relevance}`,
                        page.reliability && `reliability: ${page.reliability}`,
                      ]
                        .filter(Boolean)
                        .join(", ");
                      return `${i + 1}. [${label}](${page.url})${tags ? ` — _${tags}_` : ""}`;
                    })
                    .join("\n"),
                );
              }
              render();
              toast.style = Toast.Style.Success;
              toast.title = "Research complete";
              break;
            }
            case "error":
              throw new Error(event.data.error.message);
            default:
              break;
          }
        }
      } catch (error) {
        if (cancelled) return;
        const message = friendlyError(error);
        setMarkdown(`## Research failed\n\n${message}`);
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
  }, [query, mode]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={query}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Report" content={markdown} />
        </ActionPanel>
      }
    />
  );
}
