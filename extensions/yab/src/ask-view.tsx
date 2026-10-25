import {
  Action,
  ActionPanel,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { spawn, ChildProcess } from "child_process";
import { useEffect, useRef, useState } from "react";
import { attempt } from "./components";
import { activateYab, askInYab, cli, yabBinary } from "./yab";

type Run = {
  session?: string;
  /** The step happening now, one line, never a list. */
  now?: string;
  needs?: string;
  answer?: string;
  state: "starting" | "working" | "needs" | "done" | "failed" | "stopped";
  started: number;
  ended?: number;
};

type AskPrefs = { cli?: string; effort?: string; access?: string };

/**
 * `yab "…"` (or `yab session resume ID "…"` for a follow-up) run and read
 * as it goes: `session ID`, then `  · step` lines, then a blank line and
 * the answer. Exit 0 done, 1 failed, 3 needs the person in Yab, 130 stopped
 * (Agents.swift, AgentCLI.follow).
 */
export function AskView(props: { prompt: string; resume?: string; title?: string }) {
  const [run, setRun] = useState<Run>({ state: "starting", started: Date.now() });
  const child = useRef<ChildProcess | undefined>(undefined);
  const { push } = useNavigation();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const prefs = getPreferenceValues<AskPrefs>();
      const args = props.resume
        ? ["session", "resume", props.resume, ...(props.prompt ? [props.prompt] : [])]
        : // `yab agent`, so a task that starts with "every" or "session" is never read as one of yab's words.
          ["agent", props.prompt];
      if (!props.resume) {
        if (prefs.cli) args.push("--cli", prefs.cli);
        if (prefs.effort) args.push("--effort", prefs.effort);
        args.push("--access", prefs.access || "browser");
      }
      // Raycast stays open while a sign-in or a yes is done in Yab.
      args.push("--wait-person", "10");
      let bin: string;
      try {
        bin = await yabBinary();
      } catch (error) {
        setRun((r) => ({ ...r, state: "failed", answer: String((error as Error).message) }));
        return;
      }
      const proc = spawn(bin, args, { env: { ...process.env, YAB_CLI: "1", YAB_CALLER: "raycast" } });
      child.current = proc;
      let buffer = "";
      let answering = false;
      let answer = "";
      proc.stdout.on("data", (chunk: Buffer) => {
        if (cancelled) return;
        buffer += chunk.toString("utf8");
        let at: number;
        while ((at = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, at);
          buffer = buffer.slice(at + 1);
          if (answering) {
            answer += line + "\n";
            setRun((r) => ({ ...r, answer: answer.trim() }));
          } else if (line.startsWith("session ")) {
            setRun((r) => ({ ...r, session: line.slice(8).trim(), state: "working" }));
          } else if (line.startsWith("  · Needs you")) {
            const needs = line.replace(/^ {2}· Needs you( in Yab)?: /, "");
            setRun((r) => ({ ...r, needs, state: "needs" }));
          } else if (line.startsWith("  · ")) {
            setRun((r) => ({ ...r, now: line.slice(4), needs: undefined, state: "working" }));
          } else if (line.trim() === "") {
            answering = true;
          }
        }
      });
      proc.on("close", (code) => {
        if (cancelled) return;
        if (buffer.trim()) answer += buffer;
        const text = answer.trim();
        setRun((r) => ({
          ...r,
          answer: text || r.answer,
          ended: Date.now(),
          state: code === 0 ? "done" : code === 3 ? "needs" : code === 130 ? "stopped" : "failed",
        }));
      });
    })();
    return () => {
      cancelled = true;
      // Leaving the view leaves the task running in Yab; only Stop stops it.
      child.current?.stdout?.removeAllListeners();
    };
  }, [props.prompt, props.resume]);

  const working = run.state === "starting" || run.state === "working";
  const seconds = Math.round(((run.ended ?? Date.now()) - run.started) / 1000);
  const md = [
    `## ${(props.title || props.prompt || "Following along").replace(/\n/g, " ")}`,
    run.state === "needs" && run.needs
      ? `**Yab needs you:** ${run.needs}\n\nIt goes on by itself once that's done in Yab.`
      : "",
    working ? `_${run.now ?? "Starting…"}_` : "",
    run.answer ?? "",
    run.state === "stopped" ? "_Stopped._" : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <Detail
      isLoading={working}
      markdown={md}
      navigationTitle="Ask Yab"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="State"
            text={
              {
                starting: "Starting",
                working: "Working",
                needs: "Needs you in Yab",
                done: "Done",
                failed: "Didn't finish",
                stopped: "Stopped",
              }[run.state]
            }
            icon={
              run.state === "done"
                ? Icon.CheckCircle
                : run.state === "needs"
                  ? Icon.Person
                  : run.state === "failed"
                    ? Icon.XMarkCircle
                    : Icon.Clock
            }
          />
          <Detail.Metadata.Label title="Took" text={`${seconds} s`} />
          {run.session ? <Detail.Metadata.Label title="Session" text={run.session} /> : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {run.answer ? <Action.CopyToClipboard title="Copy Answer" content={run.answer} /> : null}
          {run.state === "needs" ? (
            <Action title="Open Yab" icon={Icon.AppWindow} onAction={() => attempt("Couldn't open Yab", activateYab)} />
          ) : null}
          {run.session && !working ? (
            <Action
              title="Ask a Follow-Up"
              icon={Icon.Reply}
              onAction={() => push(<FollowUp session={run.session!} />)}
            />
          ) : null}
          {run.session && working ? (
            <Action
              title="Stop"
              icon={Icon.Stop}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={async () => {
                await cli(["session", "stop", run.session!]);
                child.current?.kill("SIGINT");
                await showToast({ style: Toast.Style.Success, title: "Stopped" });
              }}
            />
          ) : null}
          <Action
            title="Continue in Yab's Window"
            icon={Icon.Window}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => attempt("Couldn't open ⌘J", () => askInYab(props.prompt, false))}
          />
        </ActionPanel>
      }
    />
  );
}

export function FollowUp({ session, steer }: { session: string; steer?: boolean }) {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle={steer ? "Change of Plan" : "Follow-Up"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            onSubmit={async (v: { text: string }) => {
              const text = v.text.trim();
              if (!text) return;
              if (!steer) return push(<AskView prompt={text} resume={session} />);
              await cli(["session", "steer", session, text]);
              await showToast({ style: Toast.Style.Success, title: "Told the agent" });
              push(<AskView prompt="" resume={session} title={text} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={steer ? "Instead" : "And then"}
        placeholder={steer ? "Only nonstop flights" : "What next?"}
        autoFocus
      />
    </Form>
  );
}

export function AskForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle="Ask Yab"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask"
            onSubmit={(v: { text: string; aboutTab: boolean }) => {
              const text = v.text.trim();
              if (!text) return;
              push(<AskAboutTab text={text} aboutTab={v.aboutTab} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="What to do"
        placeholder="Find the cheapest flight to Lisbon on Nov 12"
        autoFocus
      />
      <Form.Checkbox id="aboutTab" label="About the tab in front" defaultValue={false} />
    </Form>
  );
}

function AskAboutTab({ text, aboutTab }: { text: string; aboutTab: boolean }) {
  const [prompt, setPrompt] = useState<string>();
  useEffect(() => {
    if (!aboutTab) return setPrompt(text);
    import("./yab").then(async ({ focusedTab }) => {
      const tab = await focusedTab().catch(() => undefined);
      setPrompt(tab ? `${text}\n\nAbout the tab in front: ${tab.title} (${tab.url})` : text);
    });
  }, []);
  return prompt ? <AskView prompt={prompt} /> : <Detail isLoading markdown="" />;
}
