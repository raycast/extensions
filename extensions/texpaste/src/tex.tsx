import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Form,
  closeMainWindow,
  confirmAlert,
  environment,
  getPreferenceValues,
  Icon,
  Keyboard,
  LaunchProps,
  LaunchType,
  launchCommand,
  List,
  LocalStorage,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { execFile } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { promisify } from "util";
import { useEffect, useMemo, useState } from "react";
import { cleanLatex, renderSVG } from "./render";
import { TEMPLATES } from "./templates";
import { copyEquation, writePNG } from "swift:../swift";
import { COLOR_PRESETS, colorName, isDark, normalizeColor } from "./colors";

const run = promisify(execFile);

type Format = "pdf" | "svg" | "png";
const FORMAT_LABEL: Record<Format, string> = { pdf: "PDF", svg: "SVG", png: "PNG" };
const FORMAT_KEY: Record<Format, Keyboard.KeyEquivalent> = { pdf: "1", svg: "2", png: "3" };
const HISTORY_LIMIT = 100;

interface Prefs {
  color?: string;
  fontSize?: string;
  pngScale?: string;
  inlineStyle?: boolean;
  autoPaste?: boolean;
}
interface HistoryEntry {
  latex: string;
  usedAt: number;
}

const prefs = getPreferenceValues<Prefs>();
const FONT_SIZE = Math.max(4, parseFloat(prefs.fontSize || "40") || 40);
const DISPLAY = !prefs.inlineStyle;
const AUTO_PASTE = prefs.autoPaste !== false;
const PREF_COLOR = normalizeColor(prefs.color) ?? "#000000";

const MACROS_DIR = join(homedir(), ".config", "texpaste");
const MACROS_FILE = join(MACROS_DIR, "macros.tex");
const WORK_DIR = join(environment.supportPath, "work");

function ensureMacrosFile(): void {
  if (existsSync(MACROS_FILE)) return;
  mkdirSync(MACROS_DIR, { recursive: true });
  writeFileSync(
    MACROS_FILE,
    [
      "% TeXPaste macros — loaded before every equation.",
      "% One definition per line, e.g.:",
      "\\newcommand{\\R}{\\mathbb{R}}",
      "\\newcommand{\\N}{\\mathbb{N}}",
      "\\newcommand{\\Z}{\\mathbb{Z}}",
      "\\newcommand{\\C}{\\mathbb{C}}",
      "% \\newcommand{\\norm}[1]{\\left\\lVert #1 \\right\\rVert}",
      "",
    ].join("\n"),
  );
}

function readMacros(): string {
  try {
    return readFileSync(MACROS_FILE, "utf8");
  } catch {
    return "";
  }
}

interface Preview {
  key: string;
  markdown: string;
  error?: string;
  width?: number;
  height?: number;
  previewColor?: string;
}

let previewCounter = 0;
/** Renders the equation to a retina PNG and returns detail-pane markdown for it. */
async function buildPreview(latex: string, exportColor: string, macros: string, key: string): Promise<Preview> {
  // Keep the preview readable on Raycast's background even when exporting e.g. black in dark mode.
  const bgDark = environment.appearance === "dark";
  const color = isDark(exportColor) === bgDark ? (bgDark ? "#FFFFFF" : "#000000") : exportColor;
  let svg: string, width: number, height: number;
  try {
    ({ svg, width, height } = renderSVG(latex, { color, fontSize: FONT_SIZE, display: DISPLAY, macros }));
  } catch (e) {
    const msg = (e as Error).message;
    return { key, error: msg, markdown: `### ⚠️ TeX error\n\n\`\`\`\n${msg}\n\`\`\`` };
  }
  // Fit the detail pane: up to ~340pt wide / 170pt tall, never blown up more than 2.5×.
  const zoom = Math.min(340 / width, 170 / height, 2.5);
  const shownHeight = Math.max(14, Math.round(height * zoom));

  mkdirSync(WORK_DIR, { recursive: true });
  const id = `${Date.now()}-${previewCounter++}`;
  const pngFile = join(WORK_DIR, `preview-${id}.png`);
  await writePNG(svg, zoom * 2, pngFile);
  // Remove older previews, but keep a few in case Raycast is still loading one.
  const old = readdirSync(WORK_DIR)
    .filter((f) => f.startsWith("preview-") && f.endsWith(".png"))
    .sort()
    .slice(0, -4);
  for (const f of old) rmSync(join(WORK_DIR, f), { force: true });

  return {
    key,
    width,
    height,
    previewColor: color,
    markdown: `![equation](${encodeURI("file://" + pngFile)}?raycast-height=${shownHeight})`,
  };
}

export default function Command(props: LaunchProps<{ launchContext: { picked?: string } }>) {
  const [text, setText] = useState(props.fallbackText ?? "");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [lastFormat, setLastFormat] = useState<Format>("pdf");
  const [color, setColor] = useState(PREF_COLOR);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [macros, setMacros] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [customColors, setCustomColors] = useState<string[]>([]);

  async function applyColor(hex: string, customs: string[], name?: string) {
    const next = normalizeColor(hex);
    if (!next) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid color", message: "Use a hex value like #1A4FD0" });
      return;
    }
    setColor(next);
    await LocalStorage.setItem("colorOverride", next);
    if (!COLOR_PRESETS.some((p) => p.hex === next) && !customs.includes(next)) {
      const list = [next, ...customs].slice(0, 8);
      setCustomColors(list);
      await LocalStorage.setItem("customColors", JSON.stringify(list));
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Equation color: ${name ?? next}`,
      message: "Used for PDF, SVG and PNG",
    });
  }

  useEffect(() => {
    ensureMacrosFile();
    setMacros(readMacros());
    (async () => {
      const [h, f, c, cc] = await Promise.all([
        LocalStorage.getItem<string>("history"),
        LocalStorage.getItem<string>("lastFormat"),
        LocalStorage.getItem<string>("colorOverride"),
        LocalStorage.getItem<string>("customColors"),
      ]);
      if (h) setHistory(JSON.parse(h));
      if (f === "pdf" || f === "svg" || f === "png") setLastFormat(f);
      if (c && normalizeColor(c)) setColor(normalizeColor(c)!);
      const customs: string[] = cc ? JSON.parse(cc) : [];
      setCustomColors(customs);
      // Coming back from the color panel / eyedropper (the pick-color command saved it already).
      const picked = normalizeColor(props.launchContext?.picked);
      if (picked) {
        setColor(picked);
        await showToast({
          style: Toast.Style.Success,
          title: `Equation color: ${colorName(picked)}`,
          message: "Used for PDF, SVG and PNG",
        });
      }
      setLoading(false);
    })();
  }, []);

  const saveHistory = async (next: HistoryEntry[]) => {
    setHistory(next);
    await LocalStorage.setItem("history", JSON.stringify(next));
  };

  // Which equation is selected (typed one, a history row, or a template)?
  const selectedLatex = useMemo(() => {
    if (!selectedId || selectedId === "current") return text;
    if (selectedId.startsWith("h:")) return history[Number(selectedId.slice(2))]?.latex ?? "";
    if (selectedId.startsWith("t:")) return TEMPLATES[Number(selectedId.slice(2))]?.latex ?? "";
    return "";
  }, [selectedId, text, history]);

  // Render the preview shortly after typing pauses; keep showing the old one until the new one is ready.
  const previewKey = `${selectedLatex}\u0000${color}\u0000${macros}`;
  useEffect(() => {
    if (!cleanLatex(selectedLatex)) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const p = await buildPreview(selectedLatex, color, macros, previewKey);
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) setPreview({ key: previewKey, markdown: `Preview failed: ${(e as Error).message}` });
      }
    }, 70);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [previewKey]);

  const exportEquation = async (latex: string, format: Format, paste: boolean) => {
    const currentMacros = readMacros(); // pick up edits to the macros file
    let svg: string;
    try {
      svg = renderSVG(latex, { color, fontSize: FONT_SIZE, display: DISPLAY, macros: currentMacros }).svg;
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "TeX error", message: (e as Error).message });
      return;
    }
    try {
      await copyEquation(svg, format, Number(prefs.pngScale || "4"));
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(e) });
      return;
    }

    const cleaned = cleanLatex(latex);
    await saveHistory(
      [{ latex: cleaned, usedAt: Date.now() }, ...history.filter((h) => h.latex !== cleaned)].slice(0, HISTORY_LIMIT),
    );
    if (format !== lastFormat) {
      setLastFormat(format);
      await LocalStorage.setItem("lastFormat", format);
    }

    if (paste) {
      await closeMainWindow({ clearRootSearch: true });
      await new Promise((r) => setTimeout(r, 120));
      try {
        await run("osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down']);
      } catch {
        await showHUD(`Copied as ${FORMAT_LABEL[format]} — paste with ⌘V (allow Raycast to control System Events)`);
      }
    } else {
      await showHUD(`Copied equation as ${FORMAT_LABEL[format]}`);
    }
  };

  const setEquationColor = (hex: string, name?: string) => applyColor(hex, customColors, name);

  const pickColor = async (mode: "panel" | "screen") => {
    await launchCommand({ name: "pick-color", type: LaunchType.UserInitiated, context: { mode, current: color } });
  };

  const resetColor = async () => {
    setColor(PREF_COLOR);
    await LocalStorage.removeItem("colorOverride");
    await showToast({ style: Toast.Style.Success, title: `Equation color reset to ${PREF_COLOR}` });
  };

  const editInInput = (latex: string) => {
    setText(latex);
    setSelectedId("current");
  };

  const verb = AUTO_PASTE ? "Paste" : "Copy";

  const exportActions = (latex: string) => (
    <>
      <ActionPanel.Section>
        <Action
          title={`${verb} as ${FORMAT_LABEL[lastFormat]}`}
          icon={AUTO_PASTE ? Icon.Clipboard : Icon.CopyClipboard}
          onAction={() => exportEquation(latex, lastFormat, AUTO_PASTE)}
        />
        <Action
          title={`${AUTO_PASTE ? "Copy" : "Paste"} as ${FORMAT_LABEL[lastFormat]}`}
          icon={AUTO_PASTE ? Icon.CopyClipboard : Icon.Clipboard}
          shortcut={{ modifiers: ["cmd"], key: "return" }}
          onAction={() => exportEquation(latex, lastFormat, !AUTO_PASTE)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Format (becomes the new default)">
        {(["pdf", "svg", "png"] as Format[]).map((f) => (
          <Action
            key={f}
            title={`${verb} as ${FORMAT_LABEL[f]}`}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: FORMAT_KEY[f] }}
            onAction={() => exportEquation(latex, f, AUTO_PASTE)}
          />
        ))}
      </ActionPanel.Section>
    </>
  );

  const commonActions = (latex: string) => (
    <ActionPanel.Section>
      <ActionPanel.Submenu
        title={`Set Equation Color (Now ${colorName(color)})`}
        icon={{ source: Icon.CircleFilled, tintColor: color }}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
      >
        {[...COLOR_PRESETS, ...customColors.map((hex) => ({ name: hex, hex }))].map((p) => (
          <Action
            key={p.hex}
            title={`${p.name}${p.hex === color ? "  ✓" : ""}`}
            icon={{ source: Icon.CircleFilled, tintColor: p.hex }}
            onAction={() => setEquationColor(p.hex, p.name)}
          />
        ))}
        <Action title="Color Panel…" icon={Icon.Swatch} onAction={() => pickColor("panel")} />
        <Action title="Pick from Screen (Eyedropper)…" icon={Icon.EyeDropper} onAction={() => pickColor("screen")} />
        <Action.Push
          title="Custom Hex…"
          icon={Icon.Pencil}
          target={<CustomColorForm current={color} onPick={(hex) => setEquationColor(hex)} />}
        />
      </ActionPanel.Submenu>
      {color !== PREF_COLOR && <Action title="Reset Color to Preference" icon={Icon.Undo} onAction={resetColor} />}
      <Action.CopyToClipboard
        title="Copy LaTeX Source"
        content={cleanLatex(latex)}
        shortcut={Keyboard.Shortcut.Common.Copy}
      />
      <Action
        title="Open Macros File"
        icon={Icon.Code}
        shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
        onAction={() => {
          ensureMacrosFile();
          open(MACROS_FILE, "TextEdit");
        }}
      />
      <Action
        title="Reload Macros"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() => {
          setMacros(readMacros());
          showToast({ style: Toast.Style.Success, title: "Macros reloaded" });
        }}
      />
    </ActionPanel.Section>
  );

  const detailFor = (id: string) => {
    if (selectedId !== id && !(id === "current" && !selectedId)) return <List.Item.Detail />;
    if (!preview || preview.key !== previewKey) {
      // Still rendering: keep the last image to avoid flicker.
      return <List.Item.Detail isLoading markdown={preview?.markdown ?? ""} />;
    }
    return (
      <List.Item.Detail
        markdown={preview.markdown}
        metadata={
          preview.error ? undefined : (
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="⏎ pastes as" text={FORMAT_LABEL[lastFormat]} />
              <List.Item.Detail.Metadata.Label
                title="Export color"
                text={colorName(color) === color ? color : `${colorName(color)} (${color})`}
                icon={{ source: Icon.CircleFilled, tintColor: color }}
              />
              {preview.previewColor !== color && (
                <List.Item.Detail.Metadata.Label
                  title="Preview"
                  text={`Shown in ${preview.previewColor === "#FFFFFF" ? "white" : "black"} for contrast`}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Size"
                text={`${preview.width!.toFixed(0)} × ${preview.height!.toFixed(0)} pt  (${FONT_SIZE} pt font)`}
              />
              <List.Item.Detail.Metadata.Label title="Style" text={DISPLAY ? "Display" : "Inline"} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Shortcuts" text="⌘1 PDF · ⌘2 SVG · ⌘3 PNG · ⌘T set color" />
            </List.Item.Detail.Metadata>
          )
        }
      />
    );
  };

  const typed = text.trim();
  const query = typed.toLowerCase();
  const historyMatches = history
    .map((h, i) => ({ ...h, i }))
    .filter((h) => !query || h.latex.toLowerCase().includes(query) || h.latex === cleanLatex(typed));
  // Templates appear when the input is empty, or when the input reads like a name ("matrix", "cases", …).
  const templateMatches = TEMPLATES.map((t, i) => ({ ...t, i })).filter(
    (t) => !query || (/^[a-z' ]+$/.test(query) && `${t.name} ${t.keywords}`.toLowerCase().includes(query)),
  );

  return (
    <List
      isLoading={loading}
      isShowingDetail
      filtering={false}
      searchText={text}
      onSearchTextChange={(t) => {
        setText(t);
        setSelectedId(t.trim() ? "current" : null);
      }}
      selectedItemId={selectedId ?? undefined}
      onSelectionChange={(id) => setSelectedId(id)}
      searchBarPlaceholder="Type LaTeX (e.g. \frac{a}{b}) or a template name (matrix, cases…)"
    >
      {typed && (
        <List.Section title="Your Equation">
          <List.Item
            id="current"
            title={text}
            icon={
              preview?.error && preview.key === previewKey
                ? { source: Icon.Warning, tintColor: Color.Orange }
                : Icon.Pencil
            }
            accessories={[{ tag: FORMAT_LABEL[lastFormat] }]}
            detail={detailFor("current")}
            actions={
              <ActionPanel>
                {exportActions(text)}
                {commonActions(text)}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="History">
        {historyMatches.map((h) => (
          <List.Item
            key={`h:${h.i}`}
            id={`h:${h.i}`}
            title={h.latex}
            icon={Icon.Clock}
            detail={detailFor(`h:${h.i}`)}
            actions={
              <ActionPanel>
                {exportActions(h.latex)}
                <ActionPanel.Section>
                  <Action
                    title="Edit Equation"
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() => editInInput(h.latex)}
                  />
                </ActionPanel.Section>
                {commonActions(h.latex)}
                <ActionPanel.Section>
                  <Action
                    title="Delete from History"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => saveHistory(history.filter((_, i) => i !== h.i))}
                  />
                  <Action
                    title="Clear History"
                    icon={Icon.XMarkCircle}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={async () => {
                      if (
                        await confirmAlert({
                          title: "Clear all equation history?",
                          primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                        })
                      )
                        await saveHistory([]);
                    }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Templates" subtitle="⏎ to start from one">
        {templateMatches.map((t) => (
          <List.Item
            key={`t:${t.i}`}
            id={`t:${t.i}`}
            title={t.name}
            subtitle={t.latex}
            keywords={[t.keywords]}
            icon={Icon.Wand}
            detail={detailFor(`t:${t.i}`)}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action title="Use Template" icon={Icon.Pencil} onAction={() => editInInput(t.latex)} />
                </ActionPanel.Section>
                {exportActions(t.latex)}
                {commonActions(t.latex)}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function CustomColorForm({ current, onPick }: { current: string; onPick: (hex: string) => void }) {
  const { pop } = useNavigation();
  const [value, setValue] = useState(current);
  const [error, setError] = useState<string | undefined>();
  return (
    <Form
      navigationTitle="Custom Equation Color"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Color"
            onSubmit={() => {
              if (!normalizeColor(value)) return setError("Use a hex value like #1A4FD0");
              onPick(value);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="hex"
        title="Hex color"
        placeholder="#1A4FD0"
        value={value}
        error={error}
        onChange={(v) => {
          setValue(v);
          setError(undefined);
        }}
      />
      <Form.Description text="Applies to PDF, SVG and PNG exports and stays until you change it. Custom colors are added to the ⌘T menu." />
    </Form>
  );
}
