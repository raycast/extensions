import { Action, ActionPanel, Clipboard, Detail, Form, Toast, showToast, useNavigation, Icon } from "@raycast/api";
import { useMemo, useState } from "react";
import { analyzeText } from "./lib/analyze";
import { INVISIBLE_CLASS } from "./lib/sets";
import { fixAllUnicode, fixInvisibleOnly } from "./lib/clean";
import { getPreferences } from "./lib/runtime";

// Precompile regexes to avoid recreating them in hot paths
const INVISIBLE_REGEX = new RegExp(INVISIBLE_CLASS, "u");
const NON_KEYBOARD_REGEX = /[\u2018\u2019\u201C\u201D\u2013\u2014\u2026]/u;

const EXAMPLE =
  "Hollywood is making a movie about your life, but it has to be in the style of a famous Black film or show (e.g., “Love Jones” vibe, “Insecure” style). Which one are you choosing?\nZWSP:\u200B Soft hyphen:\u00AD NBSP:\u00A0 Em—dash";

export default function Command() {
  const prefs = getPreferences();
  const [text, setText] = useState("");
  const [previewFlags, setPreviewFlags] = useState({
    showSpaces: prefs.previewShowSpaces,
    showNonKeyboard: prefs.previewShowNonKeyboard,
    showUnicodeTags: prefs.previewShowUnicodeTags,
  });

  const analysis = useMemo(() => analyzeText(text), [text]);
  const preview = useMemo(() => buildPreview(text, previewFlags), [text, previewFlags]);

  const { push } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Fix Only Invisible Characters"
            icon={Icon.Eraser}
            onAction={async () => {
              const cleaned = fixInvisibleOnly(text);
              setText(cleaned);
              await showToast({ style: Toast.Style.Success, title: "Removed invisible characters" });
            }}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
          <Action
            title="Fix All Unicode Characters"
            icon={Icon.Wand}
            onAction={async () => {
              const cleaned = fixAllUnicode(text, prefs);
              setText(cleaned);
              await showToast({ style: Toast.Style.Success, title: "Normalized Unicode to ASCII" });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          />
          <Action.CopyToClipboard
            title="Copy Cleaned Text"
            icon={Icon.Clipboard}
            content={text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Paste Cleaned Text"
            icon={Icon.Document}
            onAction={async () => {
              await Clipboard.copy(text);
              await showToast({ style: Toast.Style.Success, title: "Copied cleaned text. Paste with ⌘V" });
            }}
          />
          <Action
            title="See Example"
            icon={Icon.Text}
            onAction={() => setText(EXAMPLE)}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          <Action
            title="Analyze Details"
            icon={Icon.Info}
            onAction={() => push(<AnalysisDetail text={text} />)}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
          />
          <Action
            title="Copy Analysis"
            icon={Icon.Clipboard}
            onAction={async () => {
              const a = analyzeText(text);
              const summary = [
                `Invisible: ${a.invisible.count} • Non-Keyboard: ${a.nonKeyboard.count} • Special Spaces: ${a.specialSpaces.count}`,
                "",
                `Invisible: ${a.invisible.codePoints.join(", ") || "-"}`,
                `Non-Keyboard: ${a.nonKeyboard.codePoints.join(", ") || "-"}`,
                `Special Spaces: ${a.specialSpaces.codePoints.join(", ") || "-"}`,
              ].join("\n");
              await Clipboard.copy(summary);
              await showToast({ style: Toast.Style.Success, title: "Copied analysis" });
            }}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action
            title="Clear"
            icon={Icon.Trash}
            onAction={() => setText("")}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input Text"
        placeholder="Paste or type text to analyze for invisible characters…"
        value={text}
        onChange={setText}
        autoFocus
        enableMarkdown={false}
      />

      <Form.Separator />
      <Form.Description
        title="Character Analysis"
        text={`Visible: ${analysis.totalCharacters - analysis.invisible.count}  |  Invisible: ${analysis.invisible.count}\n# Characters: ${analysis.totalCharacters}   # Words: ${analysis.totalWords}`}
      />
      <Form.Description
        title="Detected"
        text={`Invisible: ${analysis.invisible.count}  •  Non-Keyboard: ${analysis.nonKeyboard.count}  •  Special Spaces: ${analysis.specialSpaces.count}`}
      />
      <Form.Separator />
      <Form.Description title="Preview" text={"Use actions to toggle markers"} />
      <Form.Checkbox
        id="spaces"
        label="Show Spaces"
        value={previewFlags.showSpaces}
        onChange={(v: boolean) => setPreviewFlags((f) => ({ ...f, showSpaces: v }))}
      />
      <Form.Checkbox
        id="nonkbd"
        label="Show Non-Keyboard"
        value={previewFlags.showNonKeyboard}
        onChange={(v: boolean) => setPreviewFlags((f) => ({ ...f, showNonKeyboard: v }))}
      />
      <Form.Checkbox
        id="unicode"
        label="Show [U+XXXX]"
        value={previewFlags.showUnicodeTags}
        onChange={(v: boolean) => setPreviewFlags((f) => ({ ...f, showUnicodeTags: v }))}
      />
      <Form.Separator />
      <Form.Description title="Revealed & Highlighted" text={preview} />
      <Form.Separator />
      <Form.Description title="Legend" text={"Markers used in the preview:"} />
      <Form.Description title="🟪 Invisible" text={"Zero-width/control/filler characters"} />
      <Form.Description title="🟩 Non-keyboard" text={"Smart quotes, dashes, ellipsis"} />
      <Form.Description title="· Space" text={"Regular space (when Show Spaces is enabled)"} />
      <Form.Description title="⍽ NBSP" text={"Non-breaking space"} />
      <Form.Description title="→ Tab" text={"Tab character"} />
      <Form.Description title="[U+XXXX]" text={"Code point tag (annotation only)"} />
    </Form>
  );
}

function buildPreview(
  text: string,
  flags: { showSpaces: boolean; showNonKeyboard: boolean; showUnicodeTags: boolean },
): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const isSpace = ch === " ";
    const isTab = ch === "\t";
    const isNBSP = ch === "\u00A0";
    // Use the shared pattern to identify invisibles without a literal regex to satisfy lint rule
    const isInvisible = INVISIBLE_REGEX.test(ch);
    const isNonKeyboard = NON_KEYBOARD_REGEX.test(ch);
    if (flags.showSpaces && (isSpace || isTab || isNBSP)) {
      out += isTab ? "→" : isNBSP ? "⍽" : "·";
    } else if (isInvisible) {
      out += "🟪"; // invisible marker
    } else if (flags.showNonKeyboard && isNonKeyboard) {
      out += "🟩";
    } else {
      out += ch;
    }
    if (flags.showUnicodeTags && ch > "\u007f") {
      out += `[U+${cp.toString(16).toUpperCase()}]`;
    }
  }
  return out;
}

function AnalysisDetail({ text }: { text: string }) {
  const a = analyzeText(text);
  const md = [
    `# Analysis`,
    `- Total characters: ${a.totalCharacters}`,
    `- Words: ${a.totalWords}`,
    `- Invisible: ${a.invisible.count} (${a.invisible.codePoints.join(", ")})`,
    `- Non-Keyboard: ${a.nonKeyboard.count} (${a.nonKeyboard.codePoints.join(", ")})`,
    `- Special Spaces: ${a.specialSpaces.count} (${a.specialSpaces.codePoints.join(", ")})`,
  ].join("\n");
  return <Detail markdown={md} />;
}
