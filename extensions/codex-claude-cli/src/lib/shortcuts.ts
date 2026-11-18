import { Keyboard, LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export type ShortcutId =
  | "chat.toggle-view"
  | "chat.delete-input"
  | "chat.scroll-up"
  | "chat.scroll-down"
  | "chat.previous-prompt"
  | "chat.next-prompt"
  | "chat.zoom-in"
  | "chat.zoom-out"
  | "chat.zoom-reset"
  | "chat.paste-image"
  | "chat.command-palette"
  | "chat.change-model"
  | "chat.permissions"
  | "chat.usage"
  | "chat.open-external"
  | "chat.end"
  | "chat.guide"
  | "terminal.up"
  | "terminal.down"
  | "terminal.left"
  | "terminal.right"
  | "terminal.enter"
  | "terminal.tab"
  | "terminal.escape"
  | "terminal.ctrl-c"
  | "terminal.ctrl-d"
  | "home.rename"
  | "home.mcp"
  | "home.skills"
  | "home.favorite-chat"
  | "home.favorite-project"
  | "home.startup"
  | "manager.new"
  | "common.refresh"
  | "usage.copy";

export type ShortcutSection = "Chat" | "Terminal Keys" | "Conversation List" | "Managers";
type ShortcutContext = "chat" | "home" | "manager";

export interface ShortcutDefinition {
  id: ShortcutId;
  title: string;
  description: string;
  section: ShortcutSection;
  contexts: ShortcutContext[];
  defaultShortcut: Keyboard.Shortcut;
}

type SimpleShortcut = {
  modifiers: Keyboard.KeyModifier[];
  key: Keyboard.KeyEquivalent;
};

type ShortcutOverrides = Partial<Record<ShortcutId, SimpleShortcut | null>>;

const storageKey = "promptcast-shortcuts-v1";
const modifierOrder: Keyboard.KeyModifier[] = ["cmd", "shift", "opt", "ctrl"];
const supportedModifiers = new Set<Keyboard.KeyModifier>(["cmd", "ctrl", "opt", "shift"]);
const supportedKeys = new Set<Keyboard.KeyEquivalent>([
  ..."abcdefghijklmnopqrstuvwxyz".split(""),
  ..."0123456789".split(""),
  ".",
  ",",
  ";",
  "=",
  "+",
  "-",
  "[",
  "]",
  "{",
  "}",
  "«",
  "»",
  "(",
  ")",
  "/",
  "\\",
  "'",
  "`",
  "§",
  "^",
  "@",
  "$",
  "return",
  "delete",
  "deleteForward",
  "tab",
  "arrowUp",
  "arrowDown",
  "arrowLeft",
  "arrowRight",
  "pageUp",
  "pageDown",
  "home",
  "end",
  "space",
  "escape",
  "enter",
  "backspace",
] as Keyboard.KeyEquivalent[]);

export const shortcutDefinitions: ShortcutDefinition[] = [
  definition(
    "chat.toggle-view",
    "Toggle Terminal View",
    "Switch between the full terminal and chat options.",
    "Chat",
    ["cmd"],
    "return",
  ),
  definition(
    "chat.delete-input",
    "Delete Input",
    "Delete one composer character or send Backspace to the CLI.",
    "Chat",
    ["cmd"],
    "backspace",
  ),
  definition(
    "chat.scroll-up",
    "Scroll Chat Up",
    "Move the rendered terminal transcript up.",
    "Chat",
    ["cmd", "shift"],
    "arrowUp",
  ),
  definition(
    "chat.scroll-down",
    "Scroll Chat Down",
    "Move the rendered terminal transcript down.",
    "Chat",
    ["cmd", "shift"],
    "arrowDown",
  ),
  definition(
    "chat.previous-prompt",
    "Previous Sent Prompt",
    "Recall the previous prompt from CLI history.",
    "Chat",
    ["cmd", "shift"],
    "arrowLeft",
  ),
  definition(
    "chat.next-prompt",
    "Next Sent Prompt",
    "Move forward through CLI prompt history.",
    "Chat",
    ["cmd", "shift"],
    "arrowRight",
  ),
  definition("chat.zoom-in", "Increase Terminal Size", "Increase terminal text size.", "Chat", ["cmd"], "+"),
  definition("chat.zoom-out", "Decrease Terminal Size", "Decrease terminal text size.", "Chat", ["cmd"], "-"),
  definition("chat.zoom-reset", "Reset Terminal Size", "Restore the default terminal text size.", "Chat", ["cmd"], "0"),
  definition(
    "chat.paste-image",
    "Paste Clipboard Image",
    "Attach the clipboard image to the CLI composer.",
    "Chat",
    ["cmd", "shift"],
    "v",
  ),
  definition(
    "chat.command-palette",
    "Open /Command Palette",
    "Browse the provider's slash commands.",
    "Chat",
    ["cmd"],
    "/",
  ),
  definition(
    "chat.change-model",
    "Change Model and Effort",
    "Open model, effort, and Fast mode controls.",
    "Chat",
    ["cmd"],
    "m",
  ),
  definition(
    "chat.permissions",
    "Change Permissions",
    "Open the permission profile selector.",
    "Chat",
    ["cmd", "shift"],
    "p",
  ),
  definition("chat.usage", "Open Usage", "Open Claude and Codex usage.", "Chat", ["cmd"], "u"),
  definition(
    "chat.open-external",
    "Open in Terminal or Editor",
    "Open or connect the session in the selected application.",
    "Chat",
    ["cmd", "shift"],
    "o",
  ),
  definition("chat.end", "End Live Chat", "Exit the CLI and close the shared process.", "Chat", ["cmd", "shift"], "x"),
  definition(
    "chat.guide",
    "Open Shortcut Guide",
    "Open the complete in-app shortcut guide.",
    "Chat",
    ["cmd", "shift"],
    "h",
  ),
  definition(
    "terminal.up",
    "Send Up",
    "Send the Up key directly to a native CLI selector.",
    "Terminal Keys",
    ["cmd"],
    "1",
  ),
  definition(
    "terminal.down",
    "Send Down",
    "Send the Down key directly to a native CLI selector.",
    "Terminal Keys",
    ["cmd"],
    "2",
  ),
  definition(
    "terminal.left",
    "Send Left",
    "Send the Left key directly to a native CLI selector.",
    "Terminal Keys",
    ["cmd"],
    "3",
  ),
  definition(
    "terminal.right",
    "Send Right",
    "Send the Right key directly to a native CLI selector.",
    "Terminal Keys",
    ["cmd"],
    "4",
  ),
  definition(
    "terminal.enter",
    "Send Enter",
    "Confirm the current native CLI selection.",
    "Terminal Keys",
    ["cmd"],
    "5",
  ),
  definition("terminal.tab", "Send Tab", "Send Tab directly to the CLI.", "Terminal Keys", ["cmd"], "6"),
  definition(
    "terminal.escape",
    "Send Escape",
    "Send a normal Escape key directly to the CLI.",
    "Terminal Keys",
    ["cmd", "shift"],
    "escape",
  ),
  definition("terminal.ctrl-c", "Send Ctrl-C", "Interrupt the current CLI operation.", "Terminal Keys", ["cmd"], "8"),
  definition("terminal.ctrl-d", "Send Ctrl-D", "Send end-of-input to the CLI.", "Terminal Keys", ["cmd"], "9"),
  definition(
    "home.rename",
    "Rename Chat",
    "Assign a local Raycast alias to a conversation.",
    "Conversation List",
    ["cmd", "shift"],
    "r",
  ),
  definition(
    "home.mcp",
    "Manage Project MCPs",
    "Open MCP servers for the selected project.",
    "Conversation List",
    ["cmd", "shift"],
    "m",
  ),
  definition(
    "home.skills",
    "Manage Project Skills",
    "Open skills for the selected project.",
    "Conversation List",
    ["cmd"],
    "d",
  ),
  definition(
    "home.favorite-chat",
    "Toggle Favorite Chat",
    "Add or remove the selected chat from favorites.",
    "Conversation List",
    ["cmd", "shift"],
    "f",
  ),
  definition(
    "home.favorite-project",
    "Toggle Favorite Project",
    "Add or remove the selected project from favorites.",
    "Conversation List",
    ["cmd", "opt"],
    "f",
  ),
  definition(
    "home.startup",
    "Configure CLI Startup",
    "Choose startup model, effort, permissions, and behavior.",
    "Conversation List",
    ["cmd", "shift"],
    "p",
  ),
  definition("manager.new", "Add MCP Server", "Create an MCP server entry.", "Managers", ["cmd"], "n"),
  definition(
    "common.refresh",
    "Refresh",
    "Refresh the current conversations, usage, MCPs, or skills view.",
    "Managers",
    ["cmd"],
    "r",
  ),
  definition("usage.copy", "Copy Usage Summary", "Copy the selected provider usage summary.", "Managers", ["cmd"], "c"),
];
const shortcutDefinitionsById = new Map(shortcutDefinitions.map((definition) => [definition.id, definition]));

let overrides: ShortcutOverrides = {};
let loaded = false;
let loading: Promise<void> | undefined;
let revision = 0;
const listeners = new Set<() => void>();

export function shortcut(id: ShortcutId): Keyboard.Shortcut | undefined {
  const override = overrides[id];
  if (override === null) return undefined;
  if (override) return override;
  return shortcutDefinition(id).defaultShortcut;
}

export function shortcutLabel(idOrShortcut: ShortcutId | Keyboard.Shortcut | undefined): string {
  const value = typeof idOrShortcut === "string" ? shortcut(idOrShortcut) : idOrShortcut;
  if (!value) return "Off";
  const simple = simpleShortcut(value);
  const modifiers = [...simple.modifiers].sort(
    (left, right) => modifierOrder.indexOf(left) - modifierOrder.indexOf(right),
  );
  return `${modifiers.map(modifierLabel).join("")}${keyLabel(simple.key)}`;
}

function shortcutDefinition(id: ShortcutId): ShortcutDefinition {
  const result = shortcutDefinitionsById.get(id);
  if (!result) throw new Error(`Unknown shortcut: ${id}`);
  return result;
}

export function shortcutIsCustomized(id: ShortcutId): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, id);
}

export function shortcutIsEnabled(id: ShortcutId): boolean {
  return shortcut(id) !== undefined;
}

export async function saveShortcut(id: ShortcutId, value: SimpleShortcut | null): Promise<void> {
  await ensureShortcutsLoaded();
  const normalized = value ? normalizeShortcut(value) : null;
  if (normalized) {
    const conflict = findShortcutConflict(id, normalized);
    if (conflict) throw new Error(`${shortcutLabel(normalized)} is already assigned to ${conflict.title}.`);
  }
  overrides = { ...overrides, [id]: normalized };
  await persistOverrides();
}

export async function resetShortcut(id: ShortcutId): Promise<void> {
  await ensureShortcutsLoaded();
  const next = { ...overrides };
  delete next[id];
  overrides = next;
  await persistOverrides();
}

export async function resetAllShortcuts(): Promise<void> {
  await ensureShortcutsLoaded();
  overrides = {};
  await LocalStorage.removeItem(storageKey);
  notifyListeners();
}

export function useShortcutStore(): boolean {
  const [, setRevision] = useState(revision);
  useEffect(() => {
    const listener = () => setRevision(revision);
    listeners.add(listener);
    void ensureShortcutsLoaded();
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return loaded;
}

function modifierLabel(modifier: Keyboard.KeyModifier): string {
  return { cmd: "⌘", ctrl: "⌃", opt: "⌥", shift: "⇧", alt: "⌥", windows: "⊞" }[modifier];
}

export function keyLabel(key: Keyboard.KeyEquivalent): string {
  const labels: Partial<Record<Keyboard.KeyEquivalent, string>> = {
    return: "↵",
    enter: "↵",
    backspace: "⌫",
    delete: "⌫",
    deleteForward: "⌦",
    tab: "⇥",
    arrowUp: "↑",
    arrowDown: "↓",
    arrowLeft: "←",
    arrowRight: "→",
    pageUp: "Page Up",
    pageDown: "Page Down",
    home: "Home",
    end: "End",
    space: "Space",
    escape: "Esc",
  };
  return labels[key] || key.toUpperCase();
}

function definition(
  id: ShortcutId,
  title: string,
  description: string,
  section: ShortcutSection,
  modifiers: Keyboard.KeyModifier[],
  key: Keyboard.KeyEquivalent,
): ShortcutDefinition {
  return {
    id,
    title,
    description,
    section,
    contexts: shortcutContexts(id, section),
    defaultShortcut: { modifiers, key },
  };
}

function shortcutContexts(id: ShortcutId, section: ShortcutSection): ShortcutContext[] {
  if (id === "chat.usage" || id === "chat.open-external") return ["chat", "home"];
  if (id === "common.refresh") return ["home", "manager"];
  if (section === "Chat" || section === "Terminal Keys") return ["chat"];
  if (section === "Conversation List") return ["home"];
  return ["manager"];
}

function simpleShortcut(value: Keyboard.Shortcut): SimpleShortcut {
  if ("macOS" in value) return value.macOS;
  return value;
}

function normalizeShortcut(value: SimpleShortcut): SimpleShortcut {
  if (!supportedKeys.has(value.key)) throw new Error("Choose a supported shortcut key.");
  const modifiers = [...new Set(value.modifiers)].filter((modifier) => supportedModifiers.has(modifier));
  if (modifiers.length === 0) throw new Error("Choose at least one modifier key.");
  return { modifiers, key: value.key };
}

function findShortcutConflict(id: ShortcutId, value: SimpleShortcut): ShortcutDefinition | undefined {
  const definition = shortcutDefinition(id);
  return shortcutDefinitions.find((candidate) => {
    if (candidate.id === id || !candidate.contexts.some((context) => definition.contexts.includes(context))) {
      return false;
    }
    const candidateShortcut = shortcut(candidate.id);
    return candidateShortcut ? shortcutsMatch(value, simpleShortcut(candidateShortcut)) : false;
  });
}

function shortcutsMatch(left: SimpleShortcut, right: SimpleShortcut): boolean {
  if (left.key !== right.key || left.modifiers.length !== right.modifiers.length) return false;
  return left.modifiers.every((modifier) => right.modifiers.includes(modifier));
}

async function ensureShortcutsLoaded(): Promise<void> {
  if (loaded) return;
  if (loading) return loading;
  loading = LocalStorage.getItem<string>(storageKey)
    .then((stored) => {
      overrides = parseOverrides(stored);
      loaded = true;
      notifyListeners();
    })
    .finally(() => {
      loading = undefined;
    });
  return loading;
}

function parseOverrides(stored: string | undefined): ShortcutOverrides {
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: ShortcutOverrides = {};
    for (const definition of shortcutDefinitions) {
      const value = parsed[definition.id];
      if (value === null) {
        result[definition.id] = null;
        continue;
      }
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const record = value as Record<string, unknown>;
      if (!Array.isArray(record.modifiers) || typeof record.key !== "string") continue;
      if (!supportedKeys.has(record.key as Keyboard.KeyEquivalent)) continue;
      const modifiers = record.modifiers.filter(
        (modifier): modifier is Keyboard.KeyModifier =>
          typeof modifier === "string" && supportedModifiers.has(modifier as Keyboard.KeyModifier),
      );
      if (modifiers.length === 0) continue;
      result[definition.id] = normalizeShortcut({ modifiers, key: record.key as Keyboard.KeyEquivalent });
    }
    return result;
  } catch {
    return {};
  }
}

async function persistOverrides(): Promise<void> {
  await LocalStorage.setItem(storageKey, JSON.stringify(overrides));
  notifyListeners();
}

function notifyListeners(): void {
  revision += 1;
  for (const listener of listeners) listener();
}
