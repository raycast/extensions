import { Icon } from "@raycast/api";

export interface TmuxCommand {
  id: string;
  command: string;
  description: string;
  category: string;
  icon?: string; // Optional: Path or system icon identifier.
  benefit?: string; // Optional: Explains why the command is useful.
}

export const tmuxCommands: TmuxCommand[] = [
  // Session Commands
  {
    id: "new-session",
    command: "tmux new-session -s <session_name>",
    description: "Creates a new session. (Terminal: `tmux new-session -s <session_name>`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.Window,
    benefit: "Starting a new session helps you isolate tasks and organize your workflow.",
  },
  {
    id: "attach-session",
    command: "tmux attach-session -t <session_name>",
    description:
      "Attaches to an existing session. (Terminal: `tmux attach-session -t <session_name>`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.Window,
    benefit: "Reattach to a running session without interrupting your ongoing processes.",
  },
  {
    id: "list-sessions",
    command: "tmux list-sessions",
    description: "Lists all active sessions. (Terminal: `tmux list-sessions`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.Window,
    benefit: "View all active sessions to manage and switch between them efficiently.",
  },
  {
    id: "kill-session",
    command: "tmux kill-session -t <session_name>",
    description: "Kills the specified session. (Terminal: `tmux kill-session -t <session_name>`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.Window,
    benefit: "Terminate sessions you no longer need to free up system resources.",
  },
  {
    id: "rename-session",
    command: "tmux rename-session <new_name>",
    description: "Renames the current session. (Terminal: `tmux rename-session <new_name>`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.Window,
    benefit: "Renaming sessions makes them easier to identify and manage.",
  },
  {
    id: "detach",
    command: "tmux detach",
    description:
      "Detaches from the current session. Shortcut: `<C-b> + d` (or `<Leader> + d`)\nTerminal: `tmux detach`",
    category: "Session Commands",
    icon: Icon.Eject,
    benefit: "Detach from your session while leaving it running in the background.",
  },
  {
    id: "kill-server",
    command: "tmux kill-server",
    description:
      "Kills the tmux server, terminating all sessions. (Terminal: `tmux kill-server`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.Trash,
    benefit: "Terminate all tmux sessions and stop the tmux server. Use with caution.",
  },
  {
    id: "list-clients",
    command: "tmux list-clients",
    description: "Lists all tmux clients attached to the server. (Terminal: `tmux list-clients`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.List,
    benefit: "Identify all tmux clients and manage your connections efficiently.",
  },
  {
    id: "switch-client",
    command: "tmux switch-client -t <client_name>",
    description:
      "Switches to another tmux client. (Terminal: `tmux switch-client -t <client_name>`) (No default shortcut)",
    category: "Session Commands",
    icon: Icon.ArrowRight,
    benefit: "Quickly switch between multiple tmux client sessions.",
  },

  // Window Commands
  {
    id: "new-window",
    command: "tmux new-window -n <window_name>",
    description:
      "Creates a new window. Shortcut: `<C-b> + c` (or `<Leader> + c`)\nTerminal: `tmux new-window -n <window_name>`",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "New windows allow you to organize different tasks within the same session.",
  },
  {
    id: "rename-window",
    command: "tmux rename-window <new_name>",
    description:
      "Renames the current window. Shortcut: `<C-b> + ,` (or `<Leader> + ,`)\nTerminal: `tmux rename-window <new_name>`",
    category: "Window Commands",
    icon: Icon.Pencil,
    benefit: "Renaming windows helps you keep track of your work and improve navigation.",
  },
  {
    id: "kill-window",
    command: "tmux kill-window",
    description: "Kills the current window. Shortcut: `<C-b> + &` (or `<Leader> + &`)\nTerminal: `tmux kill-window`",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "Close windows you no longer need to streamline your session.",
  },
  {
    id: "list-windows",
    command: "tmux list-windows",
    description:
      "Lists all windows in the session. Shortcut: `<C-b> + w` (or `<Leader> + w`)\nTerminal: `tmux list-windows`",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "View all windows to quickly switch between different tasks.",
  },
  {
    id: "next-window",
    command: "tmux next-window",
    description: "Moves to the next window. Shortcut: `<C-b> + n` (or `<Leader> + n`)\nTerminal: `tmux next-window`",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "Cycle forward through windows to find the one you need.",
  },
  {
    id: "previous-window",
    command: "tmux previous-window",
    description:
      "Moves to the previous window. Shortcut: `<C-b> + p` (or `<Leader> + p`)\nTerminal: `tmux previous-window`",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "Cycle backward through windows to quickly access your last window.",
  },
  {
    id: "last-window",
    command: "tmux last-window",
    description:
      "Toggles to the last active window. Shortcut: `<C-b> + l` (or `<Leader> + l`)\nTerminal: `tmux last-window`",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "Quickly return to the most recently used window.",
  },
  {
    id: "select-window",
    command: "tmux select-window -t <window_name_or_index>",
    description:
      "Selects a window by name or index. (Terminal: `tmux select-window -t <window_name_or_index>`) (No default shortcut)",
    category: "Window Commands",
    icon: Icon.Sidebar,
    benefit: "Directly switch to a specific window in the session.",
  },
  {
    id: "respawn-window",
    command: "tmux respawn-window -k -t <window_name>",
    description:
      "Respawns the current window, restarting its shell or command. (Terminal: `tmux respawn-window -k -t <window_name>`) (No default shortcut)",
    category: "Window Commands",
    icon: Icon.RotateClockwise,
    benefit: "Restart a misbehaving window without closing the session.",
  },

  // Pane Commands
  {
    id: "split-window-vertical",
    command: "tmux split-window -v",
    description:
      'Splits the pane vertically. Shortcut: `<C-b> + "` (or `<Leader> + "`)\nTerminal: `tmux split-window -v`',
    category: "Pane Commands",
    icon: Icon.Terminal,
    benefit: "Divide your current pane vertically for side-by-side task management.",
  },
  {
    id: "split-window-horizontal",
    command: "tmux split-window -h",
    description:
      "Splits the pane horizontally. Shortcut: `<C-b> + %` (or `<Leader> + %`)\nTerminal: `tmux split-window -h`",
    category: "Pane Commands",
    icon: Icon.Terminal,
    benefit: "Divide your current pane horizontally for stacked task management.",
  },
  {
    id: "select-pane-up",
    command: "tmux select-pane -U",
    description:
      "Moves focus to the pane above. Shortcut: `<C-b> + Up Arrow` (or `<Leader> + Up Arrow`)\nTerminal: `tmux select-pane -U`",
    category: "Pane Commands",
    icon: Icon.ArrowUp,
    benefit: "Shift focus upward to access the pane above.",
  },
  {
    id: "select-pane-down",
    command: "tmux select-pane -D",
    description:
      "Moves focus to the pane below. Shortcut: `<C-b> + Down Arrow` (or `<Leader> + Down Arrow`)\nTerminal: `tmux select-pane -D`",
    category: "Pane Commands",
    icon: Icon.ArrowDown,
    benefit: "Shift focus downward to access the pane below.",
  },
  {
    id: "select-pane-left",
    command: "tmux select-pane -L",
    description:
      "Moves focus to the pane left of the current one. Shortcut: `<C-b> + Left Arrow` (or `<Leader> + Left Arrow`)\nTerminal: `tmux select-pane -L`",
    category: "Pane Commands",
    icon: Icon.ArrowLeft,
    benefit: "Shift focus to the pane on the left.",
  },
  {
    id: "select-pane-right",
    command: "tmux select-pane -R",
    description:
      "Moves focus to the pane right of the current one. Shortcut: `<C-b> + Right Arrow` (or `<Leader> + Right Arrow`)\nTerminal: `tmux select-pane -R`",
    category: "Pane Commands",
    icon: Icon.ArrowRight,
    benefit: "Shift focus to the pane on the right.",
  },
  {
    id: "display-panes",
    command: "tmux display-panes",
    description:
      "Displays pane numbers to assist in selection. Shortcut: `<C-b> + q` (or `<Leader> + q`)\nTerminal: `tmux display-panes`",
    category: "Pane Commands",
    icon: Icon.Hashtag,
    benefit: "Show pane numbers for quick selection by number.",
  },
  {
    id: "kill-pane",
    command: "tmux kill-pane",
    description:
      "Kills the current pane. (Usually run via command prompt as there’s no default shortcut.)\nTerminal: `tmux kill-pane`",
    category: "Pane Commands",
    icon: Icon.Trash,
    benefit: "Terminate a pane you no longer need.",
  },
  {
    id: "swap-pane",
    command: "tmux swap-pane -s <src-pane> -t <dst-pane>",
    description:
      "Swaps two panes. (Run via the command prompt.)\nTerminal: `tmux swap-pane -s <src-pane> -t <dst-pane>`",
    category: "Pane Commands",
    icon: Icon.ArrowClockwise,
    benefit: "Swap the positions of two panes for a better layout.",
  },
  {
    id: "move-pane",
    command: "tmux move-pane -s <src-pane> -t <dst-pane>",
    description:
      "Moves a pane from one location to another. (Run via the command prompt.)\nTerminal: `tmux move-pane -s <src-pane> -t <dst-pane>`",
    category: "Pane Commands",
    icon: Icon.ArrowClockwise,
    benefit: "Reposition a pane within your layout.",
  },
  {
    id: "break-pane",
    command: "tmux break-pane",
    description: "Breaks the current pane into a separate window. (Terminal: `tmux break-pane`) (No default shortcut)",
    category: "Pane Commands",
    icon: Icon.Window,
    benefit: "Promote a pane to its own window for focused work.",
  },
  {
    id: "join-pane",
    command: "tmux join-pane -s <source-pane> -t <target-pane>",
    description:
      "Joins a pane from another window into the current window. (Terminal: `tmux join-pane -s <source-pane> -t <target-pane>`) (No default shortcut)",
    category: "Pane Commands",
    icon: Icon.ArrowClockwise,
    benefit: "Merge a pane from a different window into the current layout.",
  },
  {
    id: "capture-pane",
    command: "tmux capture-pane -S -",
    description:
      "Captures the contents of the current pane. (Terminal: `tmux capture-pane -S -`) (No default shortcut)",
    category: "Pane Commands",
    icon: Icon.Document,
    benefit: "Capture the output of a pane for later review or logging.",
  },
  {
    id: "list-panes",
    command: "tmux list-panes",
    description: "Lists all panes in the current window. (Terminal: `tmux list-panes`) (No default shortcut)",
    category: "Pane Commands",
    icon: Icon.List,
    benefit: "View all panes in the current window for better navigation.",
  },
  {
    id: "pipe-pane",
    command: "tmux pipe-pane -o 'cat > output.txt'",
    description:
      "Pipes output from a pane to an external command or file. (Terminal: `tmux pipe-pane -o 'cat > output.txt'`) (No default shortcut)",
    category: "Pane Commands",
    icon: Icon.Terminal,
    benefit: "Redirect pane output to a file or command for logging or processing.",
  },
  {
    id: "respawn-pane",
    command: "tmux respawn-pane -k -t <pane_id>",
    description:
      "Respawns the current pane, restarting its command. (Terminal: `tmux respawn-pane -k -t <pane_id>`) (No default shortcut)",
    category: "Pane Commands",
    icon: Icon.RotateClockwise,
    benefit: "Restart a misbehaving pane without disrupting the rest of your layout.",
  },

  // Resize Commands
  {
    id: "resize-pane-left",
    command: "tmux resize-pane -L 10",
    description: "Resizes the pane by moving its left border left 10 cells.\n(Terminal: `tmux resize-pane -L 10`)",
    category: "Resize Commands",
    icon: Icon.ChevronLeft,
    benefit: "Decrease the pane width by shifting its left boundary.",
  },
  {
    id: "resize-pane-right",
    command: "tmux resize-pane -R 10",
    description: "Resizes the pane by moving its right border right 10 cells.\n(Terminal: `tmux resize-pane -R 10`)",
    category: "Resize Commands",
    icon: Icon.ChevronRight,
    benefit: "Increase the pane width by shifting its right boundary.",
  },
  {
    id: "resize-pane-up",
    command: "tmux resize-pane -U 5",
    description: "Resizes the pane by moving its top border up 5 cells.\n(Terminal: `tmux resize-pane -U 5`)",
    category: "Resize Commands",
    icon: Icon.ChevronUp,
    benefit: "Decrease the pane height by shifting its top boundary.",
  },
  {
    id: "resize-pane-down",
    command: "tmux resize-pane -D 5",
    description: "Resizes the pane by moving its bottom border down 5 cells.\n(Terminal: `tmux resize-pane -D 5`)",
    category: "Resize Commands",
    icon: Icon.ChevronDown,
    benefit: "Increase the pane height by shifting its bottom boundary.",
  },

  // Copy/Paste Commands
  {
    id: "copy-mode",
    command: "tmux copy-mode",
    description:
      "Enters copy mode for scrolling/selecting text. Shortcut: `<C-b> + [` (or `<Leader> + [`)\nTerminal: `tmux copy-mode`",
    category: "Copy/Paste Commands",
    icon: Icon.Clipboard,
    benefit: "Enter copy mode to navigate and select text from your terminal history.",
  },
  {
    id: "paste-buffer",
    command: "tmux paste-buffer",
    description:
      "Pastes from the copy buffer. Shortcut: `<C-b> + ]` (or `<Leader> + ]`)\nTerminal: `tmux paste-buffer`",
    category: "Copy/Paste Commands",
    icon: Icon.Clipboard,
    benefit: "Paste the contents of the copy buffer into your current pane.",
  },
  {
    id: "save-buffer",
    command: "tmux save-buffer <file_path>",
    description:
      "Saves the current copy buffer to a file. (Terminal: `tmux save-buffer <file_path>`) (No default shortcut)",
    category: "Copy/Paste Commands",
    icon: Icon.Document,
    benefit: "Store the contents of your buffer to a file for backup or further analysis.",
  },
  {
    id: "show-buffer",
    command: "tmux show-buffer",
    description:
      "Displays the contents of the current copy buffer. (Terminal: `tmux show-buffer`) (No default shortcut)",
    category: "Copy/Paste Commands",
    icon: Icon.Clipboard,
    benefit: "Quickly view the contents of your copy buffer.",
  },
  {
    id: "set-buffer",
    command: "tmux set-buffer <text>",
    description:
      "Sets the contents of the paste buffer to the given text. (Terminal: `tmux set-buffer <text>`) (No default shortcut)",
    category: "Copy/Paste Commands",
    icon: Icon.Clipboard,
    benefit: "Manually update the buffer with custom content.",
  },
  {
    id: "list-buffers",
    command: "tmux list-buffers",
    description: "Lists all buffers stored in tmux. (Terminal: `tmux list-buffers`) (No default shortcut)",
    category: "Copy/Paste Commands",
    icon: Icon.List,
    benefit: "Manage and review multiple copy buffers within your session.",
  },
  {
    id: "choose-buffer",
    command: "tmux choose-buffer",
    description:
      "Opens an interface to choose from available buffers. (Terminal: `tmux choose-buffer`) (No default shortcut)",
    category: "Copy/Paste Commands",
    icon: Icon.Clipboard,
    benefit: "Select and manage buffers using an interactive interface.",
  },

  // Layout & Options
  {
    id: "select-layout",
    command: "tmux select-layout <layout>",
    description:
      "Changes the window layout (e.g., even-horizontal, main-vertical).\n(Terminal: `tmux select-layout <layout>`) (No default shortcut)",
    category: "Layout & Options",
    icon: Icon.AppWindow,
    benefit: "Automatically organize panes within a window using predefined layouts.",
  },
  {
    id: "toggle-synchronize-panes",
    command: "tmux set-window-option synchronize-panes",
    description:
      "Toggles synchronized input for all panes.\n(Terminal: `tmux set-window-option synchronize-panes`) (No default shortcut)",
    category: "Layout & Options",
    icon: Icon.Sidebar,
    benefit: "Enable or disable synchronized input across all panes to run commands simultaneously.",
  },
  {
    id: "set-option",
    command: "tmux set-option -g <option> <value>",
    description: "Sets a tmux option globally. (Terminal: `tmux set-option -g <option> <value>`) (No default shortcut)",
    category: "Layout & Options",
    icon: Icon.Gear,
    benefit: "Customize tmux behavior by setting global options.",
  },
  {
    id: "show-options",
    command: "tmux show-options -g",
    description: "Displays global tmux options. (Terminal: `tmux show-options -g`) (No default shortcut)",
    category: "Layout & Options",
    icon: Icon.List,
    benefit: "Review current tmux settings and configurations.",
  },

  // Miscellaneous Commands
  {
    id: "command-prompt",
    command: "tmux command-prompt",
    description:
      "Opens the tmux command prompt. Shortcut: `<C-b> + :` (or `<Leader> + :`)\nTerminal: `tmux command-prompt`",
    category: "Miscellaneous Commands",
    icon: Icon.Terminal,
    benefit: "Open an interactive prompt to enter tmux commands.",
  },
  {
    id: "list-keys",
    command: "tmux list-keys",
    description: "Displays current key bindings.\n(Terminal: `tmux list-keys`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.List,
    benefit: "View all key bindings to customize or learn the shortcuts in tmux.",
  },
  {
    id: "reload-config",
    command: "tmux source-file ~/.tmux.conf",
    description:
      "Reloads your tmux configuration file.\n(Terminal: `tmux source-file ~/.tmux.conf`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.RotateClockwise,
    benefit: "Reload your tmux configuration to apply recent changes.",
  },
  {
    id: "lock-session",
    command: "tmux lock-session",
    description: "Locks the current tmux session.\n(Terminal: `tmux lock-session`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.Lock,
    benefit: "Secure your session by locking it when you step away.",
  },
  {
    id: "clock-mode",
    command: "tmux clock-mode",
    description: "Displays a clock in the current pane. (Terminal: `tmux clock-mode`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.Clock,
    benefit: "Keep track of time directly within your terminal.",
  },
  {
    id: "display-message",
    command: "tmux display-message 'Message'",
    description:
      "Displays a message in the tmux status line. (Terminal: `tmux display-message 'Message'`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.Message,
    benefit: "Show notifications or custom messages on the tmux status line.",
  },
  {
    id: "list-commands",
    command: "tmux list-commands",
    description: "Lists all available tmux commands. (Terminal: `tmux list-commands`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.List,
    benefit: "Discover all commands available in tmux for extended functionality.",
  },
  {
    id: "run-shell",
    command: "tmux run-shell '<command>'",
    description:
      "Runs a shell command from within tmux. (Terminal: `tmux run-shell '<command>'`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.Terminal,
    benefit: "Execute external shell commands without leaving tmux.",
  },
  {
    id: "if-shell",
    command: "tmux if-shell '<condition>' '<command>' '<alternate>'",
    description:
      "Evaluates a shell command and runs a tmux command based on its result. (Terminal: `tmux if-shell '<condition>' '<command>' '<alternate>'`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.QuestionMark,
    benefit: "Conditionally execute commands based on shell command outcomes.",
  },
  {
    id: "confirm-before",
    command: "tmux confirm-before -p 'Are you sure?' '<command>'",
    description:
      "Prompts for confirmation before executing a command. (Terminal: `tmux confirm-before -p 'Are you sure?' '<command>'`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.QuestionMark,
    benefit: "Prevent accidental execution of potentially dangerous commands.",
  },
  {
    id: "wait-for",
    command: "tmux wait-for <target>",
    description:
      "Waits until a signal is received on a specified target. (Terminal: `tmux wait-for <target>`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.Stopwatch,
    benefit: "Synchronize actions in tmux by waiting for a specific event.",
  },
  {
    id: "refresh-client",
    command: "tmux refresh-client -S",
    description: "Refreshes the tmux client display. (Terminal: `tmux refresh-client -S`) (No default shortcut)",
    category: "Miscellaneous Commands",
    icon: Icon.RotateClockwise,
    benefit: "Force a refresh of the client display to update changes.",
  },

  // Zoom Commands
  {
    id: "toggle-zoom",
    command: "tmux resize-pane -Z",
    description:
      "Toggles zoom for the active pane. Shortcut: `<C-b> + z` (or `<Leader> + z`)\nTerminal: `tmux resize-pane -Z`",
    category: "Zoom Commands",
    icon: Icon.Maximize,
    benefit:
      "Maximize the current pane to fill the entire window for focused work, then toggle back to the original layout.",
  },
];
