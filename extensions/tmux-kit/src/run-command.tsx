import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  LocalStorage,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TmuxError, listSessions, runRawCommand } from "./lib/tmux";
import { codeBlock } from "./lib/ui";

const HISTORY_KEY = "tmux-command-history";
const HISTORY_MAX = 20;

const QUICK_PRESETS = [
  "list-sessions",
  "list-windows",
  "list-clients",
  "kill-session -a",
  "show-options -g",
  "clear-history",
  "set -g mouse off",
  "set -g status off",
  "find-window ",
  "display-message '#{pane_current_path}'",
];

export default function RunCommand() {
  const { push } = useNavigation();
  const [cmd, setCmd] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed)) setHistory(parsed);
        } catch {
          // ignore
        }
      }
    })();
  }, []);

  const submit = async () => {
    const trimmed = cmd.trim();
    if (!trimmed) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Command is empty",
      });
      return;
    }

    // Destructive tmux commands (kill-session -a, kill-server, …) run via
    // /bin/sh with no undo. Confirm first. Match any "kill…" command so tmux
    // abbreviations and aliases (kill-ses, kill-serv, killp, killw) can't slip
    // past the guard — every real tmux command starting with "kill" is a kill.
    if (/^kill/i.test(trimmed)) {
      let detail = `tmux ${trimmed}`;
      if (/^kill-s/i.test(trimmed)) {
        try {
          const all = await listSessions();
          if (all.length > 0) {
            detail +=
              "\n\nCurrent sessions:\n" + all.map((s) => `• ${s.name}${s.attached ? " (attached)" : ""}`).join("\n");
          }
        } catch {
          // If listing fails, confirm with the command text alone.
        }
      }
      const ok = await confirmAlert({
        title: "Run destructive tmux command?",
        message: `${detail}\n\nThis can terminate sessions/windows/panes and cannot be undone.`,
        primaryAction: { title: "Run", style: Alert.ActionStyle.Destructive },
      });
      if (!ok) return;
    }

    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, HISTORY_MAX);
    setHistory(next);
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));

    try {
      const out = await runRawCommand(trimmed);
      push(<CommandResult command={trimmed} stdout={out.stdout} stderr={out.stderr} />);
    } catch (e) {
      const stderr = e instanceof TmuxError ? e.stderr : String(e);
      push(<CommandResult command={trimmed} stdout="" stderr={stderr} failed />);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run" icon={Icon.Play} onSubmit={submit} />
          <ActionPanel.Submenu title="Insert Preset" icon={Icon.List} shortcut={{ modifiers: ["cmd"], key: "i" }}>
            {QUICK_PRESETS.map((p) => (
              <Action key={p} title={p} onAction={() => setCmd(p)} />
            ))}
          </ActionPanel.Submenu>
          {history.length > 0 && (
            <ActionPanel.Submenu
              title="Insert from History"
              icon={Icon.Clock}
              shortcut={{ modifiers: ["cmd"], key: "h" }}
            >
              {history.map((h) => (
                <Action key={h} title={h} onAction={() => setCmd(h)} />
              ))}
            </ActionPanel.Submenu>
          )}
          {history.length > 0 && (
            <Action
              title="Clear History"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={async () => {
                await LocalStorage.removeItem(HISTORY_KEY);
                setHistory([]);
                await showToast({
                  style: Toast.Style.Success,
                  title: "History cleared",
                });
              }}
            />
          )}
        </ActionPanel>
      }
    >
      <Form.TextField
        id="cmd"
        title="Tmux command"
        placeholder="e.g. list-windows"
        value={cmd}
        onChange={setCmd}
        autoFocus
      />
      <Form.Description text="Input runs as `tmux <input>` via /bin/sh -c, so quotes and variables are parsed by the shell." />
      {history.length > 0 && <Form.Description text={`Recent: ${history.slice(0, 5).join("  ·  ")}`} />}
    </Form>
  );
}

function CommandResult({
  command,
  stdout,
  stderr,
  failed,
}: {
  command: string;
  stdout: string;
  stderr: string;
  failed?: boolean;
}) {
  const parts: string[] = [`# tmux ${command}`, "", failed ? "> **Failed**" : "> **Success**", ""];
  if (stdout.trim().length > 0) {
    parts.push("**stdout**", codeBlock(stdout.trimEnd()), "");
  } else {
    parts.push("_no stdout_", "");
  }
  if (stderr.trim().length > 0) {
    parts.push("**stderr**", codeBlock(stderr.trimEnd()));
  }

  return (
    <Detail
      markdown={parts.join("\n")}
      navigationTitle={`tmux ${command}`}
      actions={
        <ActionPanel>
          {stdout.length > 0 && <Action.CopyToClipboard title="Copy Stdout" content={stdout} />}
          {stderr.length > 0 && <Action.CopyToClipboard title="Copy Stderr" content={stderr} />}
          <Action.CopyToClipboard
            title="Copy Command"
            content={`tmux ${command}`}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
