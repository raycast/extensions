import { Detail } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { abbreviate, adapterName, formatCost, formatTokens, statusLabel } from "../lib/format";
import { hub } from "../lib/hub";
import { Agent, AgentDetail, TailOutput } from "../lib/types";
import { AgentActions } from "./AgentActions";

/** Markdown for an agent: what it's waiting on, its brief, recent activity. */
export function agentMarkdown(detail: AgentDetail | undefined, tail: TailOutput | undefined, agent: Agent): string {
  const parts: string[] = [];
  if (agent.status === "needsInput" && agent.statusDetail) parts.push(`> **Waiting on you:** ${agent.statusDetail}`);
  if (agent.reported) parts.push(`**Says:** ${agent.reported}`);
  else if (agent.currentTask) parts.push(`**Task:** ${agent.currentTask}`);
  const recent = detail?.transcript.filter((entry) => entry.role !== "tool").slice(-6) ?? [];
  if (recent.length > 0) {
    parts.push(
      "## Recent\n\n" +
        recent
          .map(
            (entry) =>
              `**${entry.role === "user" ? "You" : "Agent"}:** ${entry.text.replace(/\n+/g, " ").slice(0, 600)}`,
          )
          .join("\n\n"),
    );
  } else if (tail && tail.lines.length > 0) {
    parts.push("## Terminal\n\n```\n" + tail.lines.slice(-20).join("\n") + "\n```");
  }
  const brief = detail?.brief.trim();
  if (brief) parts.push("## Brief\n\n" + brief.replace(/^# Brief\s*/i, ""));
  if (detail && detail.log.length > 0)
    parts.push(
      "## Log\n\n" +
        detail.log
          .slice(-6)
          .map((line) => `- ${line}`)
          .join("\n"),
    );
  return parts.join("\n\n") || "_Nothing yet._";
}

export function AgentDetailView(props: { agent: Agent; onChange?: () => void }) {
  const { agent } = props;
  const {
    data: detail,
    isLoading,
    revalidate,
  } = usePromise((id: string) => hub<AgentDetail>(["agent", id]), [agent.id]);
  const { data: tail } = usePromise(
    async (id: string, hosted: boolean) => (hosted ? hub<TailOutput>(["tail", id, "-n", "40"]) : undefined),
    [agent.id, agent.terminalID !== undefined],
  );
  const current = detail?.agent ?? agent;
  const cost = formatCost(current.usage);

  return (
    <Detail
      navigationTitle={current.name}
      isLoading={isLoading}
      markdown={`# ${current.name}\n\n` + agentMarkdown(detail, tail, current)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Status" text={statusLabel[current.status]} />
          <Detail.Metadata.Label title="Agent" text={adapterName(current)} />
          <Detail.Metadata.Label title="Folder" text={abbreviate(current.worktreePath ?? current.workingDirectory)} />
          {current.project?.branch && (
            <Detail.Metadata.TagList title="Branch">
              <Detail.Metadata.TagList.Item text={current.project.branch} />
            </Detail.Metadata.TagList>
          )}
          {current.ports.length > 0 && <Detail.Metadata.Label title="Ports" text={current.ports.join(", ")} />}
          {current.usage && (
            <Detail.Metadata.Label
              title="Usage"
              text={`${formatTokens(
                current.usage.inputTokens +
                  current.usage.outputTokens +
                  current.usage.cacheReadTokens +
                  current.usage.cacheWriteTokens,
              )} tokens${cost ? ` · ~${cost}` : ""}`}
            />
          )}
          {detail && <Detail.Metadata.Label title="Files" text={abbreviate(detail.folderPath)} />}
        </Detail.Metadata>
      }
      actions={
        <AgentActions
          agent={current}
          showDetail={false}
          onChange={() => {
            revalidate();
            props.onChange?.();
          }}
        />
      }
    />
  );
}
