import { Action, ActionPanel, Detail, Form, Icon, useNavigation, Keyboard } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { Endpoint, endpoints, formatTimings, health, prefs, runAgent, Timings } from "./calypso";

/**
 * Shared chat view for every Ask command.
 *
 * `target` is what separates the commands: "calypso-2" pins the primary endpoint and
 * "calypso-1" the fallback, so the command name always matches the server that answered.
 * "auto" tries the primary first. In every case the configured cloud provider is the last
 * candidate, so an unreachable server degrades to Cerebras/Groq/Inception instead of erroring.
 */
export function AskView({ prompt, target, title }: { prompt: string; target: string; title: string }) {
  const [answer, setAnswer] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [timings, setTimings] = useState<Timings | null>(null);
  const [tools, setTools] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => {
    const p = prefs();
    const ctrl = new AbortController();
    aborter.current = ctrl;
    let cancelled = false;

    (async () => {
      const candidates = endpoints(p, target);
      let chosen: Endpoint | null = null;
      for (const ep of candidates) {
        if (await health(ep, p)) {
          chosen = ep;
          break;
        }
      }
      if (cancelled) return;
      if (!chosen) {
        setError(
          [
            `No endpoint responded for **${title}**.`,
            "",
            "Check, in order:",
            "1. The machine hosting your model is reachable from here (VPN or LAN up).",
            "2. That machine is awake and its model server is running.",
            "3. The Base URL preference points at the right host and port.",
            "",
            "Set **Cloud Fallback Provider** + **Cloud API Key** in this extension's preferences to",
            "keep answering from Cerebras / Groq / Inception when both rigs are asleep.",
          ].join("\n"),
        );
        setLoading(false);
        return;
      }

      setEndpoint(chosen);
      try {
        for await (const ev of runAgent(chosen, p, prompt, ctrl.signal)) {
          if (cancelled) return;
          if (ev.content) setAnswer((s) => s + ev.content);
          if (ev.reasoning) setReasoning((s) => s + ev.reasoning);
          if (ev.timings) setTimings(ev.timings);
          if (ev.toolCall) setTools((t) => [...t, `→ ${ev.toolCall}`]);
          if (ev.toolResult) setTools((t) => [...t, `   ${ev.toolResult}`]);
          if (ev.done) break;
        }
      } catch (e) {
        if (!cancelled && (e as Error).name !== "AbortError") setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [prompt, target]);

  const p = prefs();
  const showThinking = p.showReasoning && reasoning.length > 0;

  let markdown: string;
  if (error) {
    markdown = `## ${title} unreachable\n\n${error}`;
  } else {
    const parts = [`> ${prompt.replace(/\n/g, "\n> ")}`, ""];
    if (tools.length > 0) parts.push("**Tools**", "", "```", ...tools, "```", "");
    if (showThinking) parts.push("---", "", "**Thinking**", "", reasoning.trim(), "", "---", "");
    parts.push(
      answer || (loading ? "_Thinking…_" : "_(empty response — raise Max Tokens above the reasoning budget)_"),
    );
    markdown = parts.join("\n");
  }

  // A pinned command that answered from the cloud must say so, or you cannot tell which
  // model you are reading.
  const fellBack = endpoint?.isCloud === true;

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      navigationTitle={endpoint ? endpoint.label : title}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Endpoint" text={endpoint?.label ?? "resolving…"} />
          <Detail.Metadata.Label title="Model" text={endpoint?.model ?? "—"} />
          {fellBack && <Detail.Metadata.Label title="Note" text="local rig down — cloud fallback" />}
          <Detail.Metadata.Label title="Speed" text={timings ? formatTimings(timings) : loading ? "streaming…" : "—"} />
          <Detail.Metadata.Label title="Tools" text={tools.filter((t) => t.startsWith("→")).length.toString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Answer" content={answer} />
          <Action.CopyToClipboard
            title="Copy Question and Answer"
            content={`Q: ${prompt}\n\nA: ${answer}`}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {loading && (
            <Action
              title="Stop Generating"
              icon={Icon.Stop}
              onAction={() => {
                aborter.current?.abort();
                setLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

/** Shown when a command is launched with no argument. */
export function PromptForm({ target, title }: { target: string; title: string }) {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            icon={Icon.Bolt}
            onSubmit={() => {
              if (text.trim()) push(<AskView prompt={text.trim()} target={target} title={title} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="prompt" title="Prompt" placeholder={`${title}…`} value={text} onChange={setText} />
    </Form>
  );
}
