export type CheatSection =
  | "Core"
  | "Window"
  | "Pane"
  | "Session"
  | "Copy mode"
  | "Misc"
  | "Command mode"
  | "Resurrect"
  | "Files";

export type CheatEntry = {
  id: string;
  section: CheatSection;
  title: string;
  /** Key sequence, e.g. "prefix d" — shown in subtitle, copyable */
  shortcut?: string;
  /** Tmux command (after `prefix :`), e.g. "kill-session -a" — shown in subtitle, copyable */
  command?: string;
  /** Shell command, e.g. "tmux attach -t name" — copyable */
  shell?: string;
  /** Short one-line description (shown as accessory + in detail). Optional. */
  description?: string;
  /** Optional longer markdown for the detail view */
  details?: string;
  /** Keywords for search (added to Raycast keywords) */
  keywords?: string[];
};

const E = (entry: CheatEntry): CheatEntry => entry;

// Note: "prefix" refers to whatever prefix key is configured in tmux.conf
// (default `Ctrl+b`; common remap `Ctrl+a`). Shortcuts below use stock tmux defaults.

export const CHEAT_ENTRIES: CheatEntry[] = [
  // ── Core ─────────────────────────────────────────────────────────────────
  E({
    id: "core-detach",
    section: "Core",
    title: "Detach",
    shortcut: "prefix d",
    description:
      "Detach the current client; the session keeps running in the background.",
    keywords: ["detach", "background"],
  }),
  E({
    id: "core-attach",
    section: "Core",
    title: "Attach to a session",
    shell: "tmux attach -t <name>",
    description:
      "Attach to a named session. `tmux a` reattaches the most recent one.",
    keywords: ["attach"],
  }),
  E({
    id: "core-list-sessions",
    section: "Core",
    title: "List sessions",
    shell: "tmux ls",
    description: "List all sessions. Equivalent to `tmux list-sessions`.",
    keywords: ["list", "ls"],
  }),
  E({
    id: "core-new-session",
    section: "Core",
    title: "New named session",
    shell: "tmux new -s <name>",
    description:
      "Create and attach to a named session. Add `-d` to create detached.",
    keywords: ["new", "create"],
  }),
  E({
    id: "core-kill-session",
    section: "Core",
    title: "Kill session by name",
    shell: "tmux kill-session -t <name>",
    description: "Terminate a specific session.",
    keywords: ["kill"],
  }),
  E({
    id: "core-kill-server",
    section: "Core",
    title: "Kill tmux server",
    shell: "tmux kill-server",
    description: "Stop the tmux server entirely (all sessions exit).",
    keywords: ["kill", "server", "exit"],
  }),

  // ── Window ───────────────────────────────────────────────────────────────
  E({
    id: "win-new",
    section: "Window",
    title: "New window",
    shortcut: "prefix c",
    description: "Open a new window (tab) inheriting the current pane's cwd.",
    keywords: ["new", "tab"],
  }),
  E({
    id: "win-next",
    section: "Window",
    title: "Next window",
    shortcut: "prefix n",
    description: "Switch to the next window.",
  }),
  E({
    id: "win-prev",
    section: "Window",
    title: "Previous window",
    shortcut: "prefix p",
    description: "Switch to the previous window.",
  }),
  E({
    id: "win-last",
    section: "Window",
    title: "Last window",
    shortcut: "prefix l",
    description: "Toggle to the most recently visited window.",
    keywords: ["last", "toggle"],
  }),
  E({
    id: "win-jump",
    section: "Window",
    title: "Jump to window N",
    shortcut: "prefix 0..9",
    description: "Jump directly to window number N.",
    keywords: ["jump", "goto"],
  }),
  E({
    id: "win-picker",
    section: "Window",
    title: "Window picker (tree)",
    shortcut: "prefix w",
    description: "Interactive window/session picker.",
    keywords: ["choose", "tree"],
  }),
  E({
    id: "win-rename",
    section: "Window",
    title: "Rename window",
    shortcut: "prefix ,",
    description: "Rename the current window.",
  }),
  E({
    id: "win-kill",
    section: "Window",
    title: "Kill window",
    shortcut: "prefix &",
    description: "Kill the current window (asks for confirmation).",
    keywords: ["kill", "close"],
  }),
  E({
    id: "win-move",
    section: "Window",
    title: "Move window to index N",
    command: "move-window -t N",
    description: "Move the current window to position N.",
  }),

  // ── Pane ─────────────────────────────────────────────────────────────────
  E({
    id: "pane-split-h",
    section: "Pane",
    title: "Split horizontally",
    shortcut: 'prefix "',
    description: "Split the current pane top/bottom.",
    keywords: ["split", "horizontal"],
  }),
  E({
    id: "pane-split-v",
    section: "Pane",
    title: "Split vertically",
    shortcut: "prefix %",
    description: "Split the current pane left/right.",
    keywords: ["split", "vertical"],
  }),
  E({
    id: "pane-cycle",
    section: "Pane",
    title: "Next pane",
    shortcut: "prefix o",
    description: "Switch to the next pane (clockwise).",
  }),
  E({
    id: "pane-move",
    section: "Pane",
    title: "Move between panes",
    shortcut: "prefix ↑/↓/←/→",
    description: "Select pane by direction.",
    keywords: ["arrow", "navigate"],
  }),
  E({
    id: "pane-zoom",
    section: "Pane",
    title: "Toggle pane zoom",
    shortcut: "prefix z",
    description:
      "Temporarily maximize the current pane (press again to restore).",
    keywords: ["zoom", "fullscreen", "maximize"],
  }),
  E({
    id: "pane-numbers",
    section: "Pane",
    title: "Show pane numbers",
    shortcut: "prefix q",
    description: "Briefly display pane numbers; press a number to jump.",
  }),
  E({
    id: "pane-kill",
    section: "Pane",
    title: "Kill pane",
    shortcut: "prefix x",
    description: "Kill the current pane (asks for confirmation).",
    keywords: ["kill", "close"],
  }),
  E({
    id: "pane-swap",
    section: "Pane",
    title: "Swap pane with next / previous",
    shortcut: "prefix { / }",
    description: "Swap the current pane with the previous/next one.",
    keywords: ["swap"],
  }),
  E({
    id: "pane-resize",
    section: "Pane",
    title: "Resize pane",
    shortcut: "prefix Ctrl+↑/↓/←/→",
    description: "Hold prefix, then use Ctrl+arrow keys to resize.",
    keywords: ["resize"],
  }),
  E({
    id: "pane-break",
    section: "Pane",
    title: "Break pane to new window",
    shortcut: "prefix !",
    description: "Promote the current pane into its own window.",
    keywords: ["break", "promote"],
  }),
  E({
    id: "pane-layout",
    section: "Pane",
    title: "Cycle layouts",
    shortcut: "prefix Space",
    description:
      "Cycle through preset layouts (even-h / even-v / main-h / main-v / tiled).",
    keywords: ["layout"],
  }),

  // ── Session ──────────────────────────────────────────────────────────────
  E({
    id: "sess-picker",
    section: "Session",
    title: "Session picker",
    shortcut: "prefix s",
    description: "Interactive session picker.",
  }),
  E({
    id: "sess-prev",
    section: "Session",
    title: "Previous session",
    shortcut: "prefix (",
  }),
  E({
    id: "sess-next",
    section: "Session",
    title: "Next session",
    shortcut: "prefix )",
  }),
  E({
    id: "sess-rename",
    section: "Session",
    title: "Rename current session",
    shortcut: "prefix $",
  }),

  // ── Copy mode ────────────────────────────────────────────────────────────
  E({
    id: "copy-enter",
    section: "Copy mode",
    title: "Enter copy mode",
    shortcut: "prefix [",
    description: "Enter copy/scroll mode.",
    keywords: ["scroll", "copy"],
  }),
  E({
    id: "copy-begin-vi",
    section: "Copy mode",
    title: "Begin selection (vi mode)",
    shortcut: "v",
    description:
      "In vi mode, press v to start visual selection. Use Space in emacs mode.",
  }),
  E({
    id: "copy-yank-vi",
    section: "Copy mode",
    title: "Yank selection (vi mode)",
    shortcut: "y",
    description:
      "In vi mode, press y to copy. Pair with `set -s copy-command 'pbcopy'` to sync to the system clipboard.",
    keywords: ["yank", "pbcopy", "clipboard"],
  }),
  E({
    id: "copy-exit",
    section: "Copy mode",
    title: "Exit copy mode",
    shortcut: "q / Esc",
  }),
  E({
    id: "copy-search-fwd",
    section: "Copy mode",
    title: "Search forward",
    shortcut: "/",
  }),
  E({
    id: "copy-search-back",
    section: "Copy mode",
    title: "Search backward",
    shortcut: "?",
  }),

  // ── Misc ─────────────────────────────────────────────────────────────────
  E({
    id: "misc-help",
    section: "Misc",
    title: "Show all key bindings",
    shortcut: "prefix ?",
    description: "Display all current bindings. Equivalent to `list-keys`.",
  }),
  E({
    id: "misc-cmd",
    section: "Misc",
    title: "Enter command mode",
    shortcut: "prefix :",
    description:
      "Open the tmux command line. Tab-completes, history with ↑↓, chain with `;`.",
  }),
  E({
    id: "misc-reload",
    section: "Misc",
    title: "Reload config",
    shortcut: "prefix : source ~/.tmux.conf",
    description: "Reload tmux.conf without restarting the server.",
    keywords: ["source", "reload"],
  }),
  E({
    id: "misc-clock",
    section: "Misc",
    title: "Show clock",
    shortcut: "prefix t",
  }),

  // ── Command mode ─────────────────────────────────────────────────────────
  E({
    id: "cmd-clear-history",
    section: "Command mode",
    title: "Clear scrollback",
    command: "clear-history",
    description: "Clear the current pane's scrollback buffer.",
    keywords: ["clear", "scrollback"],
  }),
  E({
    id: "cmd-kill-target",
    section: "Command mode",
    title: "Kill session by name",
    command: "kill-session -t <name>",
    description: "Terminate a specific session.",
  }),
  E({
    id: "cmd-kill-others",
    section: "Command mode",
    title: "Kill all other sessions",
    command: "kill-session -a",
    description: "Kill every session except the current one.",
    keywords: ["clean"],
  }),
  E({
    id: "cmd-rename-session",
    section: "Command mode",
    title: "Rename session",
    command: "rename-session <new>",
  }),
  E({
    id: "cmd-rename-window",
    section: "Command mode",
    title: "Rename window",
    command: "rename-window <new>",
  }),
  E({
    id: "cmd-move-window",
    section: "Command mode",
    title: "Move window to position",
    command: "move-window -t N",
    description: "Move the current window to position N.",
  }),
  E({
    id: "cmd-swap-window",
    section: "Command mode",
    title: "Swap windows",
    command: "swap-window -s X -t Y",
    description: "Swap windows X and Y.",
  }),
  E({
    id: "cmd-toggle-mouse",
    section: "Command mode",
    title: "Toggle mouse mode",
    command: "set -g mouse on",
    description:
      "Enable mouse support (scroll, click-focus, drag-resize); use `off` to disable.",
  }),
  E({
    id: "cmd-toggle-status",
    section: "Command mode",
    title: "Toggle status bar",
    command: "set -g status off",
    description:
      "Hide the status bar (handy for screenshots/recording); `on` to restore.",
  }),
  E({
    id: "cmd-find-window",
    section: "Command mode",
    title: "Find window by text",
    command: "find-window <text>",
    description: "Search visible window contents and jump to a match.",
  }),
  E({
    id: "cmd-respawn-pane",
    section: "Command mode",
    title: "Respawn pane",
    command: "respawn-pane -k",
    description: "Restart the shell in the current pane (no new pane).",
  }),
  E({
    id: "cmd-display-panes",
    section: "Command mode",
    title: "Display pane numbers",
    command: "display-panes",
    description: "Briefly flash pane numbers; press a number to jump.",
  }),
  E({
    id: "cmd-list-keys",
    section: "Command mode",
    title: "List key bindings",
    command: "list-keys",
    description: "List all key bindings (equivalent to prefix ?).",
  }),
  E({
    id: "cmd-move-window-cross",
    section: "Command mode",
    title: "Move window across sessions",
    command: "move-window -s src:N -t dst:",
    description: "Move window N from session `src` to session `dst`.",
  }),

  // ── Resurrect ────────────────────────────────────────────────────────────
  E({
    id: "resurrect-about",
    section: "Resurrect",
    title: "About tmux-resurrect",
    shell: "https://github.com/tmux-plugins/tmux-resurrect",
    description:
      "Plugin that saves/restores session, window, and pane layouts across tmux restarts. This extension ships dedicated save/restore commands.",
    keywords: ["plugin"],
  }),
  E({
    id: "resurrect-save-key",
    section: "Resurrect",
    title: "Save layout (plugin default)",
    shortcut: "prefix Ctrl+s",
    description: "The plugin's default save binding.",
    keywords: ["save", "backup"],
  }),
  E({
    id: "resurrect-restore-key",
    section: "Resurrect",
    title: "Restore layout (plugin default)",
    shortcut: "prefix Ctrl+r",
    description: "The plugin's default restore binding.",
    keywords: ["restore"],
  }),
  E({
    id: "resurrect-save-cmd",
    section: "Resurrect",
    title: "Save via command",
    command: "run-shell ~/.tmux/plugins/tmux-resurrect/scripts/save.sh",
    description: "Trigger an immediate save.",
  }),
  E({
    id: "resurrect-restore-cmd",
    section: "Resurrect",
    title: "Restore via command",
    command: "run-shell ~/.tmux/plugins/tmux-resurrect/scripts/restore.sh",
    description: "Restore the most recent saved layout.",
  }),

  // ── Files ────────────────────────────────────────────────────────────────
  E({
    id: "file-tmux-conf",
    section: "Files",
    title: "~/.tmux.conf",
    description:
      "Main tmux configuration: prefix key, bindings, appearance, plugin loader.",
    keywords: ["config"],
  }),
  E({
    id: "file-tmux-plugins",
    section: "Files",
    title: "~/.tmux/plugins/",
    description: "Default install directory used by TPM (Tmux Plugin Manager).",
    keywords: ["plugin", "tpm"],
  }),
];

export const SECTIONS_IN_ORDER: CheatSection[] = [
  "Core",
  "Window",
  "Pane",
  "Session",
  "Copy mode",
  "Misc",
  "Command mode",
  "Resurrect",
  "Files",
];
