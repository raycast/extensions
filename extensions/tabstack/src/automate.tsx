import { Action, ActionPanel, Detail, LaunchProps, Toast } from "@raycast/api";
import { getClient } from "./lib/tabstack";
import { useAsyncCommand } from "./lib/useAsyncCommand";

const GUARDRAILS = "browse and extract only";

export default function Command(props: LaunchProps<{ arguments: Arguments.Automate }>) {
  const { task, url } = props.arguments;

  const { markdown, isLoading } = useAsyncCommand(
    `# Automating\n\n**Task:** ${task}\n\nStarting…`,
    [task, url],
    { title: "Running agent…", message: task },
    "Automation failed",
    async ({ isCancelled, toast, setMarkdown }) => {
      let headline = "";
      const log: string[] = [];
      const render = () => {
        const head = headline ? `# ${headline}\n\n---\n\n` : `# Automating\n\n**Task:** ${task}\n\n`;
        setMarkdown(head + log.map((line) => `- ${line}`).join("\n"));
      };

      const stream = await getClient().agent.automate({ task, url, guardrails: GUARDRAILS });
      for await (const event of stream) {
        if (isCancelled()) break;
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
    },
  );

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
