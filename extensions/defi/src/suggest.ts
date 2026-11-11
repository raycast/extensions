import { workspaceLabel, type DefiWorkspace } from "./parse.ts";

export type Suggestion = {
  title: string;
  description: string;
  // What runs; `binding` is the same command in the form [keys] accepts, when there is one.
  args: string[];
  binding?: string;
  // Defi's built-in shortcut for it, in [keys] syntax, when it has one.
  shortcut?: string;
  kind: "width" | "height" | "workspace" | "column" | "window";
  // `{window}` stands for the focused window's app, filled in when the command runs.
  hud?: string;
};

// Go to, then the four moves in the order Search Workspaces offers them.
function workspaceSuggestions(workspace: DefiWorkspace, namedCount: number): Suggestion[] {
  const label = workspaceLabel(workspace);
  const named = workspace.name !== undefined;
  const target = (byName: string, byPosition?: string) =>
    named ? `${byName} ${workspace.name}` : byPosition && `${byPosition} ${workspace.position}`;
  // mod-1 … mod-9 go to the named workspaces in [workspaces].names order, which the CLI does not
  // report, then to positions on the focused display; only that second case is known here.
  const digit =
    !named && workspace.focusedDisplay && workspace.position > namedCount && workspace.position <= 9
      ? String(workspace.position)
      : undefined;
  return [
    {
      title: `Go to ${label}`,
      description: `Shows ${label} on its display.`,
      args: ["--monitor", String(workspace.display), "workspace", workspace.id],
      binding: target("workspace", "focus-workspace-position"),
      shortcut: digit && `mod-${digit}`,
      kind: "workspace",
    },
    {
      title: `Move Focused Window to ${label}`,
      description: `Moves the focused window to ${label} and follows it.`,
      args: ["move-window-to-workspace-name", workspace.id],
      binding: target("move-window-to-workspace-name", "move-window-to-workspace-position"),
      kind: "window",
      hud: `Moved {window} to ${label}`,
    },
    {
      title: `Send Focused Window to ${label}`,
      description: `Moves the focused window to ${label} and stays here.`,
      args: ["send-window-to-workspace-name", workspace.id],
      binding: target("send-window-to-workspace-name", "send-window-to-workspace-position"),
      kind: "window",
      hud: `Sent {window} to ${label}`,
    },
    {
      title: `Move Focused Column to ${label}`,
      description: `Moves the focused column to ${label} and follows it.`,
      args: ["move-column-to-workspace-name", workspace.id],
      binding: target("move-column-to-workspace-name", "move-column-to-workspace-position"),
      shortcut: digit && `mod-cmd-${digit}`,
      kind: "column",
      hud: `Moved column to ${label}`,
    },
    {
      title: `Send Focused Column to ${label}`,
      description: `Moves the focused column to ${label} and stays here.`,
      args: ["send-column-to-workspace-name", workspace.id],
      binding: target("send-column-to-workspace-name"),
      kind: "column",
      hud: `Sent column to ${label}`,
    },
  ];
}

const verbs = {
  width: { "+": ["Widen", "Widened", "Widens"], "-": ["Narrow", "Narrowed", "Narrows"] },
  height: { "+": ["Grow", "Grew", "Grows"], "-": ["Shrink", "Shrank", "Shrinks"] },
} as const;

function sized(kind: "width" | "height", sign: "+" | "-" | undefined, amount: number, points: boolean): Suggestion {
  const value = `${sign ?? ""}${amount}${points ? "" : "%"}`;
  const shown = points ? `${amount} pt` : `${amount}%`;
  const width = kind === "width";
  const subject = width ? "column" : "window";
  const whole = width ? "the usable width" : "the column height";
  const command = width ? "set-column-width" : "set-window-height";
  const fields = { args: [command, value], binding: `${command} ${value}`, kind };
  if (!sign) {
    const noun = width ? "Column Width" : "Window Height";
    return {
      ...fields,
      title: `Set ${noun} to ${shown}`,
      description: points
        ? `Makes the focused ${subject} ${amount} points wide.`
        : `Sets the focused ${width ? "column" : "stacked window"} to ${amount}% of ${whole}.`,
      hud: `${width ? "Column width" : "Window height"} ${shown}`,
    };
  }
  const [verb, past, third] = verbs[kind][sign];
  return {
    ...fields,
    title: `${verb} ${width ? "Column" : "Window"} by ${shown}`,
    description: `${third} the focused ${width ? "column" : "stacked window"} by ${points ? `${amount} points` : `${amount}% of ${whole}`}.`,
    hud: `${past} ${subject} by ${shown}`,
  };
}

// A workspace matches when the search starts its name or one of its words: "sec" finds dev-secondary.
function matchesName(name: string, text: string): boolean {
  const lowered = text.toLowerCase();
  const words = name.toLowerCase().split(/[-_.\s]+/);
  return name.toLowerCase().startsWith(lowered) || words.some((word) => word.startsWith(lowered));
}

const minNameQuery = 2;

// Commands whose argument is the search text: "60" sets a width, "h50" a stacked window's height,
// "+10" widens, "2" or "web" targets a workspace.
// Go to and the four moves for one workspace, worded from the live state.
export function forWorkspace(workspace: DefiWorkspace, workspaces: DefiWorkspace[]): Suggestion[] {
  return workspaceSuggestions(workspace, workspaces.filter((other) => other.kind === "named").length);
}

export function suggestions(query: string, workspaces: DefiWorkspace[]): Suggestion[] {
  const text = query.trim();
  if (!text) return [];
  const namedCount = workspaces.filter((workspace) => workspace.kind === "named").length;
  const forWorkspace = (workspace: DefiWorkspace) => workspaceSuggestions(workspace, namedCount);
  const result: Suggestion[] = [];

  const width = text.match(/^([+-])?(\d{1,4})\s*(%|pt|px)?$/i);
  if (width) {
    const [, sign, digits, unit] = width;
    const amount = Number(digits);
    const byPosition = !sign && !unit && workspaces.find((w) => w.focusedDisplay && w.position === amount);
    const points = unit ? unit !== "%" : amount > 100;
    const [goTo, moveWindow] = byPosition ? forWorkspace(byPosition) : [];
    if (goTo) result.push(goTo);
    // Defi clamps a width to at least 5% of the usable width.
    if (sign ? amount > 0 : points || amount >= 5) {
      result.push(sized("width", sign as "+" | "-" | undefined, amount, points));
    }
    if (moveWindow) result.push(moveWindow);
  }

  const height = text.match(/^h\s*([+-])?(\d{1,3})\s*%?$/i);
  if (height && Number(height[2]) > 0 && Number(height[2]) <= 100) {
    result.push(sized("height", height[1] as "+" | "-" | undefined, Number(height[2]), false));
  }

  // A partial name offers the two common actions; the exact name offers all five.
  if (text.length >= minNameQuery) {
    for (const workspace of workspaces) {
      if (!workspace.name || !matchesName(workspace.name, text)) continue;
      const all = forWorkspace(workspace);
      result.push(...(workspace.name.toLowerCase() === text.toLowerCase() ? all : all.slice(0, 2)));
    }
  }
  return result;
}
