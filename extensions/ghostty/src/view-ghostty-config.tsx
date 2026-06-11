import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import { Action, ActionPanel, Color, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useState } from "react";

const CONFIG_PATH = join(homedir(), ".config", "ghostty", "config");
const HEX_RE = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/;

interface ConfigEntry {
  key: string;
  value: string;
  colorHex?: string;
  group: string;
  lineIndex: number;
}

interface KnownOption {
  key: string;
  group: string;
  type: "string" | "boolean" | "number" | "color" | "enum";
  description: string;
  defaultValue?: string;
  options?: string[];
}

function getGroup(key: string): string {
  if (key.startsWith("font") || key.startsWith("adjust-")) return "Font";
  if (
    [
      "background",
      "foreground",
      "palette",
      "cursor-color",
      "cursor-text",
      "selection-background",
      "selection-foreground",
      "minimum-contrast",
      "bold-is-bright",
      "theme",
    ].includes(key)
  )
    return "Colors";
  if (key.startsWith("window")) return "Window";
  if (key.startsWith("macos")) return "macOS";
  if (key.startsWith("cursor")) return "Cursor";
  if (key === "keybind") return "Keybindings";
  if (key.startsWith("mouse") || key.startsWith("scroll") || key.startsWith("right-click")) return "Mouse & Scroll";
  if (key.startsWith("quick-terminal")) return "Quick Terminal";
  if (key.startsWith("clipboard") || key.startsWith("copy") || key.startsWith("selection") || key.startsWith("paste"))
    return "Clipboard";
  if (key.startsWith("shell") || key === "term") return "Shell";
  return "General";
}

const GROUP_ORDER = [
  "Font",
  "Colors",
  "Cursor",
  "Window",
  "Quick Terminal",
  "macOS",
  "Mouse & Scroll",
  "Clipboard",
  "Shell",
  "Keybindings",
  "General",
];

function parseConfig(raw: string): ConfigEntry[] {
  return raw.split("\n").reduce<ConfigEntry[]>((acc, line, lineIndex) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return acc;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) return acc;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    const match = value.match(HEX_RE);
    acc.push({ key, value, colorHex: match?.[0], group: getGroup(key), lineIndex });
    return acc;
  }, []);
}

function loadRaw(): string {
  try {
    return readFileSync(CONFIG_PATH, "utf-8");
  } catch {
    return "";
  }
}

const KNOWN_OPTIONS: KnownOption[] = [
  // Font
  { key: "font-family", group: "Font", type: "string", description: "Font family name" },
  { key: "font-size", group: "Font", type: "number", description: "Font size in points", defaultValue: "12" },
  { key: "font-style", group: "Font", type: "string", description: "Font style (e.g. Regular, Bold)" },
  { key: "font-style-bold", group: "Font", type: "string", description: "Bold font style override" },
  { key: "font-style-italic", group: "Font", type: "string", description: "Italic font style override" },
  { key: "font-style-bold-italic", group: "Font", type: "string", description: "Bold-italic font style override" },
  { key: "font-feature", group: "Font", type: "string", description: "OpenType font features (e.g. +liga, -calt)" },
  { key: "font-variation", group: "Font", type: "string", description: "Variable font axis settings" },
  {
    key: "adjust-cell-height",
    group: "Font",
    type: "string",
    description: "Adjust cell height (e.g. 25% or 2px)",
    defaultValue: "0",
  },
  { key: "adjust-cell-width", group: "Font", type: "string", description: "Adjust cell width", defaultValue: "0" },
  {
    key: "adjust-font-baseline",
    group: "Font",
    type: "string",
    description: "Adjust font baseline offset",
    defaultValue: "0",
  },
  // Colors
  { key: "theme", group: "Colors", type: "string", description: "Color theme name (from themes directory)" },
  { key: "background", group: "Colors", type: "color", description: "Background color", defaultValue: "#282c34" },
  {
    key: "foreground",
    group: "Colors",
    type: "color",
    description: "Foreground (text) color",
    defaultValue: "#ffffff",
  },
  { key: "cursor-color", group: "Colors", type: "color", description: "Cursor color (overrides theme)" },
  { key: "cursor-text", group: "Colors", type: "color", description: "Cursor text color" },
  { key: "selection-background", group: "Colors", type: "color", description: "Selection background color" },
  { key: "selection-foreground", group: "Colors", type: "color", description: "Selection foreground color" },
  {
    key: "minimum-contrast",
    group: "Colors",
    type: "number",
    description: "Minimum contrast ratio for text",
    defaultValue: "1",
  },
  {
    key: "bold-is-bright",
    group: "Colors",
    type: "boolean",
    description: "Use bright colors for bold text",
    defaultValue: "false",
    options: ["true", "false"],
  },
  // Cursor
  {
    key: "cursor-style",
    group: "Cursor",
    type: "enum",
    options: ["block", "bar", "underline", "block_hollow"],
    description: "Cursor shape",
    defaultValue: "block",
  },
  {
    key: "cursor-style-blink",
    group: "Cursor",
    type: "boolean",
    description: "Blinking cursor",
    defaultValue: "true",
    options: ["true", "false"],
  },
  {
    key: "cursor-opacity",
    group: "Cursor",
    type: "number",
    description: "Cursor opacity (0.0–1.0)",
    defaultValue: "1.0",
  },
  {
    key: "cursor-invert-fg-bg",
    group: "Cursor",
    type: "boolean",
    description: "Invert fg/bg colors for cursor",
    defaultValue: "false",
    options: ["true", "false"],
  },
  // Window
  {
    key: "window-height",
    group: "Window",
    type: "number",
    description: "Initial window height in rows",
    defaultValue: "0",
  },
  {
    key: "window-width",
    group: "Window",
    type: "number",
    description: "Initial window width in columns",
    defaultValue: "0",
  },
  {
    key: "window-padding-x",
    group: "Window",
    type: "number",
    description: "Horizontal padding in points",
    defaultValue: "0",
  },
  {
    key: "window-padding-y",
    group: "Window",
    type: "number",
    description: "Vertical padding in points",
    defaultValue: "0",
  },
  {
    key: "window-padding-balance",
    group: "Window",
    type: "boolean",
    description: "Balance padding to center content",
    defaultValue: "false",
    options: ["true", "false"],
  },
  {
    key: "window-decoration",
    group: "Window",
    type: "enum",
    options: ["auto", "true", "false", "none", "client", "server"],
    description: "Window decorations / title bar",
    defaultValue: "auto",
  },
  {
    key: "window-theme",
    group: "Window",
    type: "enum",
    options: ["auto", "system", "light", "dark", "ghostty"],
    description: "Window color theme",
    defaultValue: "auto",
  },
  { key: "window-title-font-family", group: "Window", type: "string", description: "Font for the window title bar" },
  {
    key: "window-new-tab-position",
    group: "Window",
    type: "enum",
    options: ["current", "end"],
    description: "Where new tabs open",
    defaultValue: "current",
  },
  {
    key: "maximize",
    group: "Window",
    type: "boolean",
    description: "Start maximized",
    defaultValue: "false",
    options: ["true", "false"],
  },
  {
    key: "fullscreen",
    group: "Window",
    type: "boolean",
    description: "Start in fullscreen",
    defaultValue: "false",
    options: ["true", "false"],
  },
  // Quick Terminal
  {
    key: "quick-terminal-position",
    group: "Quick Terminal",
    type: "enum",
    options: ["top", "bottom", "left", "right", "center"],
    description: "Quick terminal position",
    defaultValue: "top",
  },
  {
    key: "quick-terminal-size",
    group: "Quick Terminal",
    type: "string",
    description: "Quick terminal size (e.g. 40%)",
    defaultValue: "40%",
  },
  {
    key: "quick-terminal-autohide",
    group: "Quick Terminal",
    type: "boolean",
    description: "Auto-hide quick terminal when focus is lost",
    defaultValue: "true",
    options: ["true", "false"],
  },
  // macOS
  {
    key: "macos-titlebar-style",
    group: "macOS",
    type: "enum",
    options: ["native", "transparent", "tabs", "hidden"],
    description: "macOS title bar style",
    defaultValue: "native",
  },
  {
    key: "macos-option-as-alt",
    group: "macOS",
    type: "enum",
    options: ["true", "false", "left", "right"],
    description: "Treat Option key as Alt",
    defaultValue: "false",
  },
  {
    key: "macos-non-native-fullscreen",
    group: "macOS",
    type: "boolean",
    description: "Use non-native fullscreen mode",
    defaultValue: "false",
    options: ["true", "false"],
  },
  {
    key: "macos-window-shadow",
    group: "macOS",
    type: "boolean",
    description: "Show window shadow",
    defaultValue: "true",
    options: ["true", "false"],
  },
  {
    key: "macos-auto-secure-input",
    group: "macOS",
    type: "boolean",
    description: "Auto enable secure input for passwords",
    defaultValue: "true",
    options: ["true", "false"],
  },
  {
    key: "macos-secure-input-indication",
    group: "macOS",
    type: "boolean",
    description: "Show secure input indicator",
    defaultValue: "true",
    options: ["true", "false"],
  },
  { key: "macos-icon", group: "macOS", type: "string", description: "Custom app icon variant" },
  // Mouse & Scroll
  {
    key: "mouse-hide-while-typing",
    group: "Mouse & Scroll",
    type: "boolean",
    description: "Hide cursor while typing",
    defaultValue: "false",
    options: ["true", "false"],
  },
  {
    key: "mouse-scroll-multiplier",
    group: "Mouse & Scroll",
    type: "number",
    description: "Mouse scroll speed multiplier",
    defaultValue: "1",
  },
  {
    key: "mouse-shift-capture",
    group: "Mouse & Scroll",
    type: "boolean",
    description: "Capture shift+click in mouse capture mode",
    defaultValue: "false",
    options: ["true", "false"],
  },
  {
    key: "scroll-to-bottom",
    group: "Mouse & Scroll",
    type: "string",
    description: "When to scroll to bottom (keystroke, no-output)",
    defaultValue: "keystroke,no-output",
  },
  {
    key: "right-click-action",
    group: "Mouse & Scroll",
    type: "enum",
    options: ["context-menu", "paste", "copy", "copy-or-paste", "ignore"],
    description: "Right-click behavior",
    defaultValue: "context-menu",
  },
  // Clipboard
  {
    key: "clipboard-read",
    group: "Clipboard",
    type: "enum",
    options: ["ask", "allow", "deny"],
    description: "Allow programs to read clipboard",
    defaultValue: "ask",
  },
  {
    key: "clipboard-write",
    group: "Clipboard",
    type: "enum",
    options: ["ask", "allow", "deny"],
    description: "Allow programs to write clipboard",
    defaultValue: "allow",
  },
  {
    key: "clipboard-trim-trailing-spaces",
    group: "Clipboard",
    type: "boolean",
    description: "Trim trailing spaces when copying",
    defaultValue: "true",
    options: ["true", "false"],
  },
  {
    key: "clipboard-paste-protection",
    group: "Clipboard",
    type: "boolean",
    description: "Warn before pasting multi-line text",
    defaultValue: "true",
    options: ["true", "false"],
  },
  {
    key: "copy-on-select",
    group: "Clipboard",
    type: "enum",
    options: ["true", "false", "clipboard"],
    description: "Auto-copy on text selection",
    defaultValue: "true",
  },
  {
    key: "selection-clear-on-typing",
    group: "Clipboard",
    type: "boolean",
    description: "Clear selection when typing",
    defaultValue: "true",
    options: ["true", "false"],
  },
  // Shell
  {
    key: "shell-integration",
    group: "Shell",
    type: "enum",
    options: ["none", "detect", "fish", "zsh", "bash", "elvish"],
    description: "Shell integration mode",
    defaultValue: "detect",
  },
  {
    key: "shell-integration-features",
    group: "Shell",
    type: "string",
    description: "Shell integration features (cursor, sudo, title)",
    defaultValue: "cursor,sudo,title",
  },
  {
    key: "term",
    group: "Shell",
    type: "string",
    description: "TERM environment variable",
    defaultValue: "xterm-256color",
  },
  // General
  { key: "title", group: "General", type: "string", description: "Static window title (overrides dynamic)" },
  {
    key: "scrollback-limit",
    group: "General",
    type: "number",
    description: "Scrollback buffer size in bytes",
    defaultValue: "10000000",
  },
  {
    key: "confirm-close-surface",
    group: "General",
    type: "boolean",
    description: "Confirm before closing a terminal",
    defaultValue: "true",
    options: ["true", "false"],
  },
  {
    key: "quit-after-last-window-closed",
    group: "General",
    type: "boolean",
    description: "Quit app when last window closes",
    defaultValue: "false",
    options: ["true", "false"],
  },
  {
    key: "working-directory",
    group: "General",
    type: "string",
    description: "Default working directory for new terminals",
  },
  { key: "config-file", group: "General", type: "string", description: "Additional config file to load" },
  { key: "link", group: "General", type: "string", description: "Custom URL link pattern with regex" },
  { key: "class", group: "General", type: "string", description: "WM_CLASS for the window (Linux)" },
];

function entryIcon(entry: ConfigEntry) {
  if (entry.colorHex) return { source: Icon.CircleFilled, tintColor: entry.colorHex };
  return { source: Icon.Dot, tintColor: Color.SecondaryText };
}

export default function Command() {
  const [raw, setRaw] = useState<string>(loadRaw);
  const [mode, setMode] = useState<"configured" | "all">("configured");

  const entries = parseConfig(raw);
  const configuredKeys = new Set(entries.map((e) => e.key));

  const saveRaw = (newRaw: string) => {
    const dir = dirname(CONFIG_PATH);
    mkdirSync(dir, { recursive: true });
    const tmp = `${CONFIG_PATH}.tmp`;
    writeFileSync(tmp, newRaw, "utf-8");
    renameSync(tmp, CONFIG_PATH);
    setRaw(newRaw);
  };

  const searchBarAccessory = (
    <List.Dropdown tooltip="View" onChange={(v) => setMode(v as "configured" | "all")}>
      <List.Dropdown.Item title="My Config" value="configured" />
      <List.Dropdown.Item title="All Options" value="all" />
    </List.Dropdown>
  );

  if (mode === "all") {
    const groupedOptions = KNOWN_OPTIONS.reduce<Record<string, KnownOption[]>>((acc, opt) => {
      if (!acc[opt.group]) acc[opt.group] = [];
      acc[opt.group].push(opt);
      return acc;
    }, {});

    const orderedGroups = GROUP_ORDER.filter((g) => groupedOptions[g]);

    return (
      <List
        navigationTitle="Ghostty — All Options"
        searchBarPlaceholder="Search options..."
        searchBarAccessory={searchBarAccessory}
      >
        {orderedGroups.map((group) => (
          <List.Section key={group} title={group}>
            {groupedOptions[group].map((opt) => {
              const currentEntry = entries.find((e) => e.key === opt.key);
              const isSet = configuredKeys.has(opt.key);
              return (
                <List.Item
                  key={opt.key}
                  title={opt.key}
                  subtitle={currentEntry?.value ?? (opt.defaultValue ? `default: ${opt.defaultValue}` : "")}
                  icon={
                    currentEntry?.colorHex
                      ? { source: Icon.CircleFilled, tintColor: currentEntry.colorHex }
                      : isSet
                        ? { source: Icon.CheckCircle, tintColor: Color.Green }
                        : { source: Icon.Circle, tintColor: Color.SecondaryText }
                  }
                  accessories={[{ text: { value: opt.description, color: Color.SecondaryText } }]}
                  actions={
                    <ActionPanel>
                      {isSet && currentEntry ? (
                        <Action.Push
                          title="Edit Value"
                          icon={Icon.Pencil}
                          target={<EditForm entry={currentEntry} raw={raw} onSave={saveRaw} />}
                        />
                      ) : (
                        <Action.Push
                          title="Add to Config"
                          icon={Icon.Plus}
                          target={<AddForm option={opt} raw={raw} onSave={saveRaw} />}
                        />
                      )}
                      <Action.Open title="Open Config in Editor" target={CONFIG_PATH} />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        ))}
      </List>
    );
  }

  const groupedEntries = entries.reduce<Record<string, ConfigEntry[]>>((acc, entry) => {
    if (!acc[entry.group]) acc[entry.group] = [];
    acc[entry.group].push(entry);
    return acc;
  }, {});

  const orderedGroups = GROUP_ORDER.filter((g) => groupedEntries[g]);

  return (
    <List
      navigationTitle="Ghostty Config"
      searchBarPlaceholder="Filter settings..."
      searchBarAccessory={searchBarAccessory}
    >
      {orderedGroups.map((group) => (
        <List.Section key={group} title={group} subtitle={`${groupedEntries[group].length}`}>
          {groupedEntries[group].map((entry) => (
            <List.Item
              key={entry.lineIndex}
              title={entry.key}
              subtitle={entry.value}
              icon={entryIcon(entry)}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Value"
                    icon={Icon.Pencil}
                    target={<EditForm entry={entry} raw={raw} onSave={saveRaw} />}
                  />
                  <Action.CopyToClipboard title="Copy Value" content={entry.value} />
                  <Action.CopyToClipboard
                    title="Copy Key = Value"
                    content={`${entry.key} = ${entry.value}`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Open
                    title="Open Config in Editor"
                    target={CONFIG_PATH}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function EditForm({ entry, raw, onSave }: { entry: ConfigEntry; raw: string; onSave: (newRaw: string) => void }) {
  const { pop } = useNavigation();
  const knownOption = KNOWN_OPTIONS.find((o) => o.key === entry.key);
  const hasValidOptions = knownOption?.options && knownOption.options.includes(entry.value);

  const { handleSubmit, itemProps } = useForm<{ value: string }>({
    initialValues: { value: entry.value },
    validation: {
      value: hasValidOptions ? undefined : (v) => (!v || v.trim() === "" ? "Value is required" : undefined),
    },
    onSubmit: (values) => {
      const lines = raw.split("\n");
      lines[entry.lineIndex] = `${entry.key} = ${values.value}`;
      try {
        onSave(lines.join("\n"));
        showToast({ style: Toast.Style.Success, title: "Saved", message: `${entry.key} updated` });
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Failed to save config" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Edit: ${entry.key}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {knownOption?.description && <Form.Description title="About" text={knownOption.description} />}
      {hasValidOptions ? (
        <Form.Dropdown title={entry.key} {...itemProps.value}>
          {knownOption!.options!.map((o) => (
            <Form.Dropdown.Item key={o} title={o} value={o} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField title={entry.key} {...itemProps.value} />
      )}
    </Form>
  );
}

function AddForm({ option, raw, onSave }: { option: KnownOption; raw: string; onSave: (newRaw: string) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ value: string }>({
    initialValues: { value: option.defaultValue ?? "" },
    validation: {
      value: option.options ? undefined : (v) => (!v || v.trim() === "" ? "Value is required" : undefined),
    },
    onSubmit: (values) => {
      const newRaw = `${raw.trimEnd()}\n${option.key} = ${values.value}\n`;
      try {
        onSave(newRaw);
        showToast({ style: Toast.Style.Success, title: "Added", message: `${option.key} added to config` });
        pop();
      } catch (error) {
        showFailureToast(error, { title: "Failed to save config" });
      }
    },
  });

  return (
    <Form
      navigationTitle={`Add: ${option.key}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add to Config" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="About" text={option.description} />
      {option.defaultValue && <Form.Description title="Default" text={option.defaultValue} />}
      {option.options ? (
        <Form.Dropdown title={option.key} {...itemProps.value}>
          {option.options.map((o) => (
            <Form.Dropdown.Item key={o} title={o} value={o} />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField title={option.key} {...itemProps.value} />
      )}
    </Form>
  );
}
