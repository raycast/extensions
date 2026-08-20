import { Action, Clipboard, closeMainWindow, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import type { Keyboard } from "@raycast/api";
import { useCallback } from "react";
import { formatSessionMarkdown, formatSessionPlainText } from "../format";
import { loadSessionMessages } from "../load-messages";
import { getResumeCommand, openInApp, openResumeInTerminal, sourceFamily } from "../terminal";
import type { SessionMeta } from "../types";

function shortcut(mods: Keyboard.KeyModifier[], key: Keyboard.KeyEquivalent): Keyboard.Shortcut {
  return { modifiers: mods, key };
}

/**
 * Shared "open / resume / copy" action cluster, used by both the list rows (with
 * keyboard shortcuts) and the detail panel (without — the first action is primary).
 */
export function useCopySession(meta: SessionMeta): {
  copyMarkdown: () => Promise<void>;
  copyPlainText: () => Promise<void>;
} {
  const copy = useCallback(
    async (kind: "markdown" | "plain") => {
      try {
        const messages = await loadSessionMessages(meta);
        if (messages.length === 0) {
          showToast({ style: Toast.Style.Failure, title: "Empty session" });
          return;
        }
        const text =
          kind === "markdown" ? formatSessionMarkdown(meta, messages) : formatSessionPlainText(meta, messages);
        await Clipboard.copy(text);
        showToast({ style: Toast.Style.Success, title: `Copied ${messages.length} messages` });
      } catch (e) {
        showToast({ style: Toast.Style.Failure, title: "Failed to copy", message: String(e) });
      }
    },
    [meta],
  );

  return {
    copyMarkdown: useCallback(() => copy("markdown"), [copy]),
    copyPlainText: useCallback(() => copy("plain"), [copy]),
  };
}

interface SessionActionsProps {
  meta: SessionMeta;
  /** Show keyboard shortcuts and pop back to root after opening (list rows). */
  shortcuts?: boolean;
}

export function SessionActions({ meta, shortcuts = false }: SessionActionsProps) {
  const { copyMarkdown, copyPlainText } = useCopySession(meta);
  const appName = sourceFamily(meta.source) === "claude" ? "Claude" : "Codex";
  const isAppSource = meta.source === "claude-app" || meta.source === "codex-app";

  const openApp = async () => {
    try {
      await openInApp(meta);
      await closeMainWindow();
      if (shortcuts) await popToRoot();
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: `Failed to open ${appName}`, message: String(e) });
    }
  };

  const openTerminal = async () => {
    try {
      await openResumeInTerminal(meta);
      await closeMainWindow();
      if (shortcuts) await popToRoot();
    } catch (e) {
      showToast({ style: Toast.Style.Failure, title: "Failed to open terminal", message: String(e) });
    }
  };

  const openShortcut = shortcuts ? shortcut(["cmd"], isAppSource ? "o" : "t") : undefined;
  const secondaryShortcut = shortcuts ? shortcut(["cmd"], isAppSource ? "t" : "o") : undefined;

  return (
    <>
      {isAppSource ? (
        <Action title={`Open in ${appName}`} icon={Icon.AppWindow} shortcut={openShortcut} onAction={openApp} />
      ) : (
        <Action title="Resume in Terminal" icon={Icon.Terminal} shortcut={openShortcut} onAction={openTerminal} />
      )}
      {isAppSource ? (
        <Action title="Resume in Terminal" icon={Icon.Terminal} shortcut={secondaryShortcut} onAction={openTerminal} />
      ) : (
        <Action title={`Open in ${appName}`} icon={Icon.AppWindow} shortcut={secondaryShortcut} onAction={openApp} />
      )}
      <Action.CopyToClipboard
        title="Copy Resume Command"
        content={getResumeCommand(meta)}
        shortcut={shortcuts ? shortcut(["cmd"], "r") : undefined}
      />
      <Action.CopyToClipboard
        title="Copy Dangerous Resume Command"
        content={getResumeCommand(meta, undefined, { skipPermissions: true })}
        shortcut={shortcuts ? shortcut(["cmd", "shift"], "r") : undefined}
      />
      <Action
        title="Copy Markdown"
        icon={Icon.Document}
        shortcut={shortcuts ? shortcut(["cmd", "shift"], "m") : undefined}
        onAction={copyMarkdown}
      />
      <Action
        title="Copy Plain Text"
        icon={Icon.Text}
        shortcut={shortcuts ? shortcut(["cmd", "shift"], "p") : undefined}
        onAction={copyPlainText}
      />
      {meta.projectPath ? <Action.ShowInFinder path={meta.projectPath} title="Open Project in Finder" /> : null}
      {/* eslint-disable @raycast/prefer-title-case */}
      <Action.CopyToClipboard
        content={meta.id}
        title="Copy Session ID"
        shortcut={shortcuts ? shortcut(["cmd", "shift"], "c") : undefined}
      />
      {/* eslint-enable @raycast/prefer-title-case */}
      {meta.projectPath ? <Action.CopyToClipboard content={meta.projectPath} title="Copy Project Path" /> : null}
    </>
  );
}
