import { Action, ActionPanel, Detail, LaunchProps, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { friendlyError, getClient } from "./lib/tabstack";

const GUARDRAILS = "browse and extract only";

export default function Command(props: LaunchProps<{ arguments: Arguments.Automate }>) {
  const { task, url } = props.arguments;
  const [markdown, setMarkdown] = useState(`# Automating\n\n**Task:** ${task}\n\nStarting…`);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let headline = "";
    const log: string[] = [];
    const render = () => {
      const head = headline ? `# ${headline}\n\n---\n\n` : `# Automating\n\n**Task:** ${task}\n\n`;
      setMarkdown(head + log.map((line) => `- ${line}`).join("\n"));
    };

    (async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Running agent…", message: task });
      try {
        const stream = await getClient().agent.automate({ task, url, guardrails: GUARDRAILS });
        for await (const event of stream) {
          if (cancelled) break;
          switch (event.event) {
            case "task:started":
              log.push(`Task started on ${event.data.url}`);
              render();
              break;
            case "agent:status":
              log.push(event.data.message);
              render();
              break;
            case "agent:step":
              log.push(`Step ${event.data.currentIteration}`);
              render();
              break;
            case "agent:action":
              log.push(
                `Action: ${event.data.action}` +
                  (event.data.ref ? ` → ${event.data.ref}` : "") +
                  (event.data.value ? ` = ${event.data.value}` : ""),
              );
              render();
              break;
            case "agent:extracted":
              log.push(`Extracted: ${event.data.extractedData}`);
              render();
              break;
            case "task:completed":
              headline = event.data.finalAnswer ?? "Task completed";
              render();
              toast.style = Toast.Style.Success;
              toast.title = "Task complete";
              break;
            case "error":
              throw new Error(event.data.error.message);
            default:
              break;
          }
        }
      } catch (error) {
        if (cancelled) return;
        const message = friendlyError(error);
        setMarkdown(`## Automation failed\n\n${message}`);
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
  }, [task, url]);

  return (
    <Detail
      markdown={markdown}
      isLoading={isLoading}
      navigationTitle={task}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Result" content={markdown} />
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}
