import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import {
  backendLabel,
  buildCommand,
  launchInteractive,
  maybeShowGhosttyTip,
} from "./lib/platform";
import { loadSessions, Session } from "./lib/sessions";

/** One-line blockquote (callers pass already-clipped, single-line text). */
const quote = (s: string) => `> ${s}`;

/**
 * A recall-first detail: what the session was about, where it ended, then the command.
 * `showEnv` adds an Environment line — only meaningful when backends are mixed (e.g. a
 * Windows user with both WSL and native sessions); on a single-environment host it's noise.
 */
function detailMarkdown(
  s: Session,
  resumeCmd: string,
  showEnv: boolean,
): string {
  const parts = [`### ${s.title}`];
  if (s.firstPrompt)
    parts.push(`**First prompt**\n\n${quote(clip(s.firstPrompt, 300))}`);
  if (s.lastPrompt && s.lastPrompt !== s.firstPrompt)
    parts.push(`**Latest prompt**\n\n${quote(clip(s.lastPrompt, 300))}`);
  if (s.lastReply)
    parts.push(`**Latest reply**\n\n${quote(clip(s.lastReply, 400))}`);
  parts.push("---");
  const env = showEnv ? `**Environment** ${backendLabel(s.backend)} • ` : "";
  parts.push(`**Directory** \`${s.cwd}\`\n\n${env}**Session** \`${s.id}\``);
  parts.push(`**Resume**\n\n\`\`\`bash\n${resumeCmd}\n\`\`\``);
  return parts.join("\n\n");
}

/** Collapse whitespace and truncate with an ellipsis. */
function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/**
 * List Session History (merges the old Search Sessions and Resume Last).
 * Sorted newest first, so the top row is the most recent session; pressing Enter
 * to resume it doubles as "resume last".
 */
export default function ListSessions() {
  const [items, setItems] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions(200, { detail: true })
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  async function resume(s: Session) {
    try {
      await closeMainWindow();
      await launchInteractive(s.cwd, ["-r", s.id], s.backend);
      await maybeShowGhosttyTip();
    } catch {
      // fall back to copying where we can't launch
      const cmd = buildCommand(["-r", s.id], s.cwd, s.backend);
      await Clipboard.copy(cmd);
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't launch — command copied to clipboard",
        message: cmd,
        primaryAction: {
          title: "Open Preferences",
          onAction: openExtensionPreferences,
        },
      });
    }
  }

  // Only tag the environment when the list actually mixes backends (e.g. a Windows
  // user with both PowerShell and WSL sessions); otherwise it's just noise.
  const mixed = new Set(items.map((s) => s.backend)).size > 1;

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search sessions by summary, path, or ID"
      isShowingDetail
    >
      {items.map((s) => {
        const resumeCmd = buildCommand(["-r", s.id], s.cwd, s.backend);
        return (
          <List.Item
            key={s.file}
            title={s.title}
            subtitle={s.cwd}
            keywords={[s.id, s.cwd, s.firstPrompt, s.lastPrompt]}
            accessories={[
              ...(mixed ? [{ tag: backendLabel(s.backend) }] : []),
              { date: new Date(s.mtime) },
            ]}
            detail={
              <List.Item.Detail
                markdown={detailMarkdown(s, resumeCmd, mixed)}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Resume Session"
                  icon={Icon.Terminal}
                  onAction={() => resume(s)}
                />
                <Action.CopyToClipboard
                  title="Copy Resume Command"
                  content={resumeCmd}
                />
                <Action.CopyToClipboard
                  title="Copy Session ID"
                  content={s.id}
                />
                <Action.CopyToClipboard
                  title="Copy Directory Path"
                  content={s.cwd}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
