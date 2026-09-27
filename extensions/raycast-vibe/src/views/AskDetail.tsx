import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import React from "react";
import { Agent } from "../agents";
import { HeadlessResult, runHeadless } from "../headless";

export function AskDetail({
  folder,
  repoRoot,
  agent,
  question,
}: {
  folder: { path: string; name: string };
  repoRoot: string;
  agent: Agent;
  question: string;
}) {
  const { pop } = useNavigation();
  const [result, setResult] = React.useState<HeadlessResult | undefined>(
    undefined,
  );

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await runHeadless(agent, question, repoRoot);
      if (!cancelled) setResult(r);
      if (!cancelled && !r.ok) {
        await showToast({
          style: Toast.Style.Failure,
          title: r.timedOut ? "Agent timed out" : "Agent failed",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [agent.id, question, repoRoot]);

  const header = `> Answered by **${agent.name}** in \`${repoRoot}\``;
  const body = result
    ? result.ok
      ? `${header}\n\n${result.stdout}`
      : result.timedOut
        ? `${header}\n\nAgent did not respond within 120s.`
        : `${header}\n\n\`\`\`\n${result.stderr.slice(-4000) || "No error output"}\n\`\`\``
    : `${header}\n\n_Thinking…_`;

  return (
    <Detail
      navigationTitle={`${agent.name} — ${folder.name}`}
      markdown={body}
      isLoading={!result}
      actions={
        <ActionPanel>
          {result?.ok ? (
            <Action.CopyToClipboard
              title="Copy Response"
              content={result.stdout}
            />
          ) : null}
          <Action
            title="Ask Again"
            icon={Icon.RotateClockwise}
            onAction={pop}
          />
          <Action title="Close" icon={Icon.XMarkCircle} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
