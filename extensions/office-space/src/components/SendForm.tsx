import { Action, ActionPanel, Form, Icon, popToRoot, showHUD } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useState } from "react";
import { abbreviate, place, statusLabel } from "../lib/format";
import { hub } from "../lib/hub";
import { Agent, CaptureResult } from "../lib/types";

export interface Payload {
  /** Shown as the form's title. */
  kind: string;
  url?: string;
  title?: string;
  selection?: string;
  /** Page content (Markdown). */
  content?: string;
  files?: string[];
}

function preview(payload: Payload): string {
  const lines: string[] = [];
  if (payload.url) lines.push(payload.title ? `${payload.title}\n${payload.url}` : payload.url);
  if (payload.selection) {
    const text = payload.selection.trim();
    lines.push(text.length > 400 ? text.slice(0, 400) + "…" : text);
  }
  if (payload.content) lines.push(`Page content: ${payload.content.length.toLocaleString()} characters`);
  if (payload.files?.length) lines.push(payload.files.map(abbreviate).join("\n"));
  return lines.join("\n\n");
}

/** Pick an agent (best guess first), add a note, send through `hub capture`. */
export function SendForm(props: { payload: Payload }) {
  const { payload } = props;
  const { data: agents, isLoading } = usePromise(
    async (url: string) => {
      const suggested = await hub<Agent[]>(["suggest", url]);
      return suggested.filter((agent) => agent.status !== "ended");
    },
    [payload.url ?? ""],
  );
  const [agentID, setAgentID] = useState<string>();

  async function submit(values: { agent?: string; note: string }) {
    if (!values.agent) {
      await showFailureToast(new Error("No agent to send this to. Start one from Office Space first."));
      return;
    }
    const args = ["capture", "--source", "raycast", "--to", values.agent];
    if (payload.url) args.push("--url", payload.url);
    if (payload.title) args.push("--title", payload.title);
    if (values.note.trim()) args.push("--note", values.note.trim());
    for (const file of payload.files ?? []) args.push("--file", file);
    // The larger text goes through stdin; the other (if any) as an argument.
    let input: string | undefined;
    if (payload.content) {
      args.push("--stdin", "content");
      input = payload.content;
      if (payload.selection) args.push("--selection", payload.selection);
    } else if (payload.selection) {
      args.push("--stdin", "selection");
      input = payload.selection;
    }
    try {
      const result = await hub<CaptureResult>(args, { input });
      const how =
        result.delivery === "typed"
          ? `Sent to ${result.agentName}`
          : result.delivery === "nextPrompt"
            ? `Saved for ${result.agentName}'s next prompt`
            : `Saved to ${result.agentName}'s inbox`;
      await showHUD(how);
      await popToRoot();
    } catch (error) {
      await showFailureToast(error, { title: "Couldn't send" });
    }
  }

  return (
    <Form
      navigationTitle={payload.kind}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Agent" icon={Icon.Envelope} onSubmit={submit} />
        </ActionPanel>
      }
    >
      {agents && agents.length > 0 && (
        <Form.Dropdown id="agent" title="Agent" value={agentID ?? agents[0].id} onChange={setAgentID}>
          {agents.map((agent) => (
            <Form.Dropdown.Item
              key={agent.id}
              value={agent.id}
              title={agent.name}
              keywords={[place(agent), agent.project?.branch ?? ""]}
              icon={agent.terminalID ? Icon.Terminal : Icon.Person}
            />
          ))}
        </Form.Dropdown>
      )}
      {agents && agents.length > 0 && (
        <Form.Description
          text={(() => {
            const chosen = agents.find((agent) => agent.id === (agentID ?? agents[0].id));
            if (!chosen) return "";
            const delivery = chosen.terminalID
              ? "It's typed into the agent."
              : chosen.adapter === "claude-code" && chosen.integration === "hooks"
                ? "It's attached to your next prompt there."
                : "It's saved to the agent's inbox.";
            return `${statusLabel[chosen.status]} · ${place(chosen)}. ${delivery}`;
          })()}
        />
      )}
      {agents && agents.length === 0 && (
        <Form.Description text="No agents are running. Start one from Office Space first." />
      )}
      <Form.TextArea id="note" title="Note" placeholder="What should the agent do with this?" autoFocus />
      <Form.Separator />
      <Form.Description title="Sending" text={preview(payload)} />
    </Form>
  );
}
