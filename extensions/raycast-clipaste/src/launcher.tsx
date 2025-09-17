import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Toast,
  getPreferenceValues,
  showToast,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useExec, useLocalStorage, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef } from "react";
import recipes from "../assets/clipaste-recipes.json";

type RecipeDefinition = {
  id: string;
  label: string;
  args: string[];
};

type RecipeFile = {
  version: number;
  recipes: RecipeDefinition[];
};

type BufferLike = {
  toString: (encoding?: string) => string;
};

// Dependency checker
async function checkDependencies(
  clipastePath: string,
): Promise<{ isValid: boolean; error?: string }> {
  try {
    await fetch(`data:text/plain,checking clipaste at ${clipastePath}`);

    // Simple path validation
    if (!clipastePath || clipastePath.trim() === "") {
      return {
        isValid: false,
        error:
          "❌ Clipaste path is not configured.\n\nPlease set the 'clipaste binary' path in Raycast extension preferences.\n\nCommon paths:\n• ~/bin/clipaste\n• /usr/local/bin/clipaste\n• /opt/homebrew/bin/clipaste",
      };
    }

    // Check if it looks like a valid executable path
    if (clipastePath !== "clipaste" && !clipastePath.includes("/")) {
      return {
        isValid: false,
        error:
          "❌ Invalid clipaste path format.\n\nPlease use either 'clipaste' (if on PATH) or a full path like:\n• ~/bin/clipaste\n• /usr/local/bin/clipaste",
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: `❌ Failed to validate dependencies: ${String(error)}`,
    };
  }
}

type Mode = "copy" | "get" | "paste" | "status" | "clear" | "ai" | "random";

type FormValues = {
  mode: Mode;
  text?: string;
  file?: string[];
  output?: string;
  filename?: string;
  type?: "auto" | "text" | "image" | "binary";
  format?: "png" | "jpeg" | "webp" | "";
  quality?: string;
  autoExtension?: boolean;
  dryRun?: boolean;
  raw?: boolean;
  aiAction?: "summarize" | "classify" | "transform";
  aiLabels?: string;
  aiInstruction?: string;
  templateArgs?: string;
  recipeId?: string;
  clipOffset?: number;
  // Random generator fields
  randomType?: "password" | "string" | "personal-id" | "iban" | "business-id";
  randomLength?: string;
  randomTemplate?: string;
  randomShowMeta?: boolean;
  randomFormat?: "default" | "spaced" | "json";
  randomCharsets?: string;
  randomWords?: boolean;
  randomGender?: "male" | "female" | "any";
  randomAge?: string;
};

type Prefs = {
  clipastePath: string;
  defaultOutputDir?: string;
  enablePngpaste?: boolean;
  pngpastePath?: string;
};

const DEFAULT_FORM_VALUES: FormValues = {
  mode: "paste",
  type: "auto",
  clipOffset: 0,
};
const RECIPES: RecipeFile = recipes as RecipeFile;

function buildArgs(values: FormValues): string[] {
  const args: string[] = [];

  if (values.recipeId) {
    const match = RECIPES.recipes.find((r) => r.id === values.recipeId);
    if (match) args.push(...match.args);
  }

  switch (values.mode) {
    case "copy":
      args.push("copy");
      if (values.file?.length) args.push("--file", values.file[0]);
      else if (values.text?.trim()?.length) args.push(values.text);
      break;
    case "get":
      args.push("get");
      if (values.raw) args.push("--raw");
      break;
    case "paste": {
      args.push("paste");
      // Always include output directory for paste operations
      const outputDir = values.output?.trim()?.length
        ? values.output
        : "~/Desktop";
      args.push("--output", outputDir);
      if (values.filename?.trim()?.length)
        args.push("--filename", values.filename);
      if (values.type && values.type !== "auto")
        args.push("--type", values.type);
      if (values.format) args.push("--format", values.format);
      if (values.quality?.trim()?.length)
        args.push("--quality", values.quality);
      if (values.autoExtension) args.push("--auto-extension");
      if (values.dryRun) args.push("--dry-run");
      break;
    }
    case "status":
      args.push("status");
      break;
    case "clear":
      args.push("clear", "--confirm");
      break;
    case "ai": {
      args.push("ai");
      const act = values.aiAction ?? "summarize";
      args.push(act);
      if (act === "classify" && values.aiLabels)
        args.push("--labels", values.aiLabels);
      if (act === "transform" && values.aiInstruction)
        args.push("--instruction", values.aiInstruction);
      break;
    }
    case "random": {
      args.push("random");
      const randomType = values.randomType ?? "password";
      args.push(randomType);

      // Common options
      if (values.randomLength?.trim())
        args.push("--length", values.randomLength);
      if (values.randomShowMeta) args.push("--show-meta");

      // Type-specific options
      if (randomType === "password") {
        if (values.randomWords) args.push("--words");
        if (values.randomCharsets?.trim())
          args.push("--charsets", values.randomCharsets);
      } else if (randomType === "string") {
        if (values.randomTemplate?.trim())
          args.push("--template", values.randomTemplate);
      } else if (randomType === "personal-id") {
        if (values.randomGender && values.randomGender !== "any")
          args.push("--gender", values.randomGender);
        if (values.randomAge?.trim()) args.push("--age", values.randomAge);
      } else if (randomType === "iban" || randomType === "business-id") {
        if (values.randomFormat && values.randomFormat !== "default") {
          if (values.randomFormat === "spaced") args.push("--format", "spaced");
          else if (values.randomFormat === "json")
            args.push("--output", "json");
        }
      }
      break;
    }
  }

  if (values.templateArgs?.trim()) {
    const extra = values.templateArgs.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    args.push(...extra.map((s) => s.replace(/^"|"$/g, "")));
  }

  return args;
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const { push } = useNavigation();

  const { value: stored, setValue: setStored } = useLocalStorage<FormValues>(
    "clipaste.form",
    DEFAULT_FORM_VALUES,
  );

  const values = useMemo<FormValues>(
    () => stored ?? DEFAULT_FORM_VALUES,
    [stored],
  );

  function update(patch: Partial<FormValues>) {
    const next: FormValues = { ...values, ...patch };
    void setStored(next);
  }

  // Clipboard preview via Raycast Clipboard API (supports offset 0..5)
  const {
    data: clip,
    isLoading: clipLoading,
    revalidate: refreshClip,
  } = usePromise(
    async (offset: number) => Clipboard.read({ offset }),
    [values.clipOffset ?? 0],
  );

  const cli = prefs.clipastePath || "clipaste";
  const previewArgs = useMemo(() => buildArgs(values), [values]);
  const previewCmd = useMemo(
    () => `$ ${cli} ${previewArgs.map(shellQuote).join(" ")}`,
    [previewArgs, cli],
  );

  function onSubmit(v: FormValues) {
    // Check dependencies before proceeding
    checkDependencies(cli)
      .then(({ isValid, error }) => {
        if (!isValid && error) {
          void showToast(Toast.Style.Failure, "Dependency Error", error);
          return;
        }

        // Ensure we always have a valid output directory for paste operations
        let out = v.output?.trim()?.length
          ? v.output
          : prefs.defaultOutputDir || "";

        // If still empty and this is a paste operation, use Desktop as fallback
        if (!out && v.mode === "paste") {
          out = "~/Desktop";
        }

        const merged = { ...v, output: out };
        const args = buildArgs(merged);
        push(<ResultView cli={cli} args={args} />);
      })
      .catch((err) => {
        void showToast(
          Toast.Style.Failure,
          "Validation Error",
          `Failed to check dependencies: ${String(err)}`,
        );
      });
  }

  const clipPreview = useMemo(() => {
    if (!clip) return "(no clipboard data)";
    const parts: string[] = [];
    if (clip.text)
      parts.push(
        clip.text.length > 300 ? clip.text.slice(0, 300) + "…" : clip.text,
      );
    if (clip.file) parts.push(`File: ${clip.file}`);
    if (clip.html) {
      const stripped = clip.html.replace(/<[^>]*>/g, "");
      parts.push(
        `HTML: ${stripped.length > 200 ? stripped.slice(0, 200) + "…" : stripped}`,
      );
    }
    return parts.join("\\n\\n");
  }, [clip]);

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run clipaste" onSubmit={onSubmit} />
          <Action.CopyToClipboard title="Copy Command" content={previewCmd} />
          <Action
            title="Refresh Clipboard Preview"
            shortcut={{ modifiers: ["opt"], key: "r" }}
            onAction={() => {
              void refreshClip();
            }}
          />
          <Action.Push
            title="Open Clipboard Preview"
            shortcut={{ modifiers: ["opt"], key: "o" }}
            target={
              <ClipboardPreviewDetail
                clip={clip}
                onRefresh={() => {
                  void refreshClip();
                }}
              />
            }
          />
          {prefs.enablePngpaste ? (
            <Action.Push
              title="Generate PNG Preview (pngpaste)"
              target={
                <PngpastePreviewDetail
                  pngpastePath={prefs.pngpastePath || "pngpaste"}
                />
              }
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open Project (clipaste)"
            url="https://github.com/markomanninen/clipaste"
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="mode"
        title="Mode"
        value={values.mode}
        onChange={(v) => update({ mode: v as Mode })}
      >
        <Form.Dropdown.Item title="paste" value="paste" />
        <Form.Dropdown.Item title="copy" value="copy" />
        <Form.Dropdown.Item title="get" value="get" />
        <Form.Dropdown.Item title="status" value="status" />
        <Form.Dropdown.Item title="clear" value="clear" />
        <Form.Dropdown.Item title="ai (optional)" value="ai" />
        <Form.Dropdown.Item title="random" value="random" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Clipboard Preview (opt-r)"
        text={clipLoading ? "(loading…)" : clipPreview}
      />
      <Form.Dropdown
        id="clipOffset"
        title="Clipboard History Offset"
        value={String(values.clipOffset ?? 0)}
        onChange={(v) => update({ clipOffset: Number(v) })}
      >
        <Form.Dropdown.Item title="Current (0)" value="0" />
        <Form.Dropdown.Item title="Prev 1" value="1" />
        <Form.Dropdown.Item title="Prev 2" value="2" />
        <Form.Dropdown.Item title="Prev 3" value="3" />
        <Form.Dropdown.Item title="Prev 4" value="4" />
        <Form.Dropdown.Item title="Prev 5" value="5" />
      </Form.Dropdown>

      <Form.Separator />

      <Form.Description
        title="Recipe (optional)"
        text="Pick a saved recipe or leave empty."
      />
      <Form.Dropdown
        id="recipeId"
        title="Recipe"
        value={values.recipeId ?? ""}
        onChange={(v) => update({ recipeId: v || undefined })}
      >
        <Form.Dropdown.Item title="— none —" value="" />
        {RECIPES.recipes.map((r) => (
          <Form.Dropdown.Item key={r.id} title={r.label} value={r.id} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="templateArgs"
        title="Extra Args (free text)"
        placeholder='e.g. --auto-extension --filename "screenshot"'
        value={values.templateArgs ?? ""}
        onChange={(v) => update({ templateArgs: v })}
      />

      {values.mode === "copy" && (
        <>
          <Form.TextArea
            id="text"
            title="Text"
            value={values.text ?? ""}
            onChange={(v) => update({ text: v })}
          />
          <Form.FilePicker
            id="file"
            title="File"
            allowMultipleSelection={false}
            onChange={(v) => update({ file: v })}
          />
        </>
      )}

      {values.mode === "get" && (
        <Form.Checkbox
          id="raw"
          label="Raw (no newline)"
          value={values.raw ?? false}
          onChange={(v) => update({ raw: v })}
        />
      )}

      {values.mode === "paste" && (
        <>
          <Form.TextField
            id="output"
            title="Output Directory"
            placeholder="Default: Desktop (~/Desktop)"
            value={values.output ?? ""}
            onChange={(v) => update({ output: v })}
          />
          <Form.TextField
            id="filename"
            title="Filename (no extension if auto)"
            value={values.filename ?? ""}
            onChange={(v) => update({ filename: v })}
          />
          <Form.Dropdown
            id="type"
            title="Type (force)"
            value={values.type ?? "auto"}
            onChange={(v) => update({ type: v as FormValues["type"] })}
          >
            <Form.Dropdown.Item title="auto" value="auto" />
            <Form.Dropdown.Item title="text" value="text" />
            <Form.Dropdown.Item title="image" value="image" />
            <Form.Dropdown.Item title="binary" value="binary" />
          </Form.Dropdown>
          <Form.Dropdown
            id="format"
            title="Image Format"
            value={values.format ?? ""}
            onChange={(v) => update({ format: v as FormValues["format"] })}
          >
            <Form.Dropdown.Item title="(none)" value="" />
            <Form.Dropdown.Item title="png" value="png" />
            <Form.Dropdown.Item title="jpeg" value="jpeg" />
            <Form.Dropdown.Item title="webp" value="webp" />
          </Form.Dropdown>
          <Form.TextField
            id="quality"
            title="Quality (jpeg/webp)"
            placeholder="0-100"
            value={values.quality ?? ""}
            onChange={(v) => update({ quality: v })}
          />
          <Form.Checkbox
            id="autoExtension"
            label="Auto extension"
            value={values.autoExtension ?? true}
            onChange={(v) => update({ autoExtension: v })}
          />
          <Form.Checkbox
            id="dryRun"
            label="Dry run (preview only)"
            value={values.dryRun ?? false}
            onChange={(v) => update({ dryRun: v })}
          />
        </>
      )}

      {values.mode === "ai" && (
        <>
          <Form.Dropdown
            id="aiAction"
            title="AI Action"
            value={values.aiAction ?? "summarize"}
            onChange={(v) => update({ aiAction: v as FormValues["aiAction"] })}
          >
            <Form.Dropdown.Item title="summarize" value="summarize" />
            <Form.Dropdown.Item title="classify" value="classify" />
            <Form.Dropdown.Item title="transform" value="transform" />
          </Form.Dropdown>
          <Form.TextField
            id="aiLabels"
            title="Labels (classify)"
            placeholder="bug,feature,question"
            value={values.aiLabels ?? ""}
            onChange={(v) => update({ aiLabels: v })}
          />
          <Form.TextArea
            id="aiInstruction"
            title="Instruction (transform)"
            value={values.aiInstruction ?? ""}
            onChange={(v) => update({ aiInstruction: v })}
          />
        </>
      )}

      {values.mode === "random" && (
        <>
          <Form.Dropdown
            id="randomType"
            title="Generator Type"
            value={values.randomType ?? "password"}
            onChange={(v) =>
              update({ randomType: v as FormValues["randomType"] })
            }
          >
            <Form.Dropdown.Item title="password" value="password" />
            <Form.Dropdown.Item title="string (template)" value="string" />
            <Form.Dropdown.Item
              title="personal-id (Finnish)"
              value="personal-id"
            />
            <Form.Dropdown.Item title="iban (Finnish)" value="iban" />
            <Form.Dropdown.Item
              title="business-id (Finnish)"
              value="business-id"
            />
          </Form.Dropdown>

          {/* Common fields */}
          <Form.TextField
            id="randomLength"
            title="Length"
            placeholder="e.g., 12, 24"
            value={values.randomLength ?? ""}
            onChange={(v) => update({ randomLength: v })}
          />
          <Form.Checkbox
            id="randomShowMeta"
            label="Show metadata"
            value={values.randomShowMeta ?? false}
            onChange={(v) => update({ randomShowMeta: v })}
          />

          {/* Password-specific fields */}
          {values.randomType === "password" && (
            <>
              <Form.Checkbox
                id="randomWords"
                label="Use diceware words"
                value={values.randomWords ?? false}
                onChange={(v) => update({ randomWords: v })}
              />
              <Form.TextField
                id="randomCharsets"
                title="Character sets"
                placeholder="e.g., upper,lower,digits"
                value={values.randomCharsets ?? ""}
                onChange={(v) => update({ randomCharsets: v })}
              />
            </>
          )}

          {/* String template fields */}
          {values.randomType === "string" && (
            <Form.TextField
              id="randomTemplate"
              title="Template"
              placeholder="e.g., XXXX-XXXX-XXXX"
              value={values.randomTemplate ?? ""}
              onChange={(v) => update({ randomTemplate: v })}
            />
          )}

          {/* Personal ID fields */}
          {values.randomType === "personal-id" && (
            <>
              <Form.Dropdown
                id="randomGender"
                title="Gender"
                value={values.randomGender ?? "any"}
                onChange={(v) =>
                  update({ randomGender: v as FormValues["randomGender"] })
                }
              >
                <Form.Dropdown.Item title="any" value="any" />
                <Form.Dropdown.Item title="male" value="male" />
                <Form.Dropdown.Item title="female" value="female" />
              </Form.Dropdown>
              <Form.TextField
                id="randomAge"
                title="Age"
                placeholder="e.g., 25, 18-65"
                value={values.randomAge ?? ""}
                onChange={(v) => update({ randomAge: v })}
              />
            </>
          )}

          {/* IBAN/Business ID format fields */}
          {(values.randomType === "iban" ||
            values.randomType === "business-id") && (
            <Form.Dropdown
              id="randomFormat"
              title="Output Format"
              value={values.randomFormat ?? "default"}
              onChange={(v) =>
                update({ randomFormat: v as FormValues["randomFormat"] })
              }
            >
              <Form.Dropdown.Item title="default" value="default" />
              <Form.Dropdown.Item title="spaced" value="spaced" />
              <Form.Dropdown.Item title="json" value="json" />
            </Form.Dropdown>
          )}
        </>
      )}

      <Form.Separator />
      <Form.Description title="Command Preview" text={previewCmd} />
    </Form>
  );
}

function ResultView(props: { cli: string; args: string[] }) {
  const { cli, args } = props;
  const cmdString = `$ ${cli} ${args.map(shellQuote).join(" ")}`;
  const argsKey = useMemo(() => args.join("\u0000"), [args]);
  const successToastShown = useRef(false);
  const errorToastShown = useRef(false);

  useEffect(() => {
    successToastShown.current = false;
    errorToastShown.current = false;
  }, [cli, argsKey]);

  const { isLoading, data, error, revalidate } = useExec(cli, args, {
    shell: true,
    timeout: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isLoading && !error && !successToastShown.current) {
      successToastShown.current = true;
      void showToast(
        Toast.Style.Success,
        "Clipaste",
        "Command completed successfully",
      );
    }
  }, [isLoading, error]);

  useEffect(() => {
    if (!isLoading && error && !errorToastShown.current) {
      errorToastShown.current = true;
      void showToast(Toast.Style.Failure, "Clipaste error", formatError(error));
    }
  }, [isLoading, error]);

  let outputStr = "";
  if (!isLoading && data) {
    if (typeof data === "string") {
      outputStr = data;
    } else {
      try {
        if (typeof data === "object" && data !== null) {
          const maybeBuffer = data as Partial<BufferLike>;
          if (typeof maybeBuffer.toString === "function") {
            outputStr = maybeBuffer.toString("utf8");
          } else {
            outputStr = String(data);
          }
        } else {
          outputStr = String(data);
        }
      } catch {
        outputStr = "";
      }
    }
  }

  const hasError = !isLoading && Boolean(error);
  const mdParts = [
    `# ${isLoading ? "Running clipaste…" : hasError ? "❌ Error" : "✅ Done"}`,
    "",
    "```bash",
    cmdString,
    "```",
    "",
    "## Output",
    "",
  ];

  if (isLoading) {
    mdParts.push("```", "(waiting for output…)", "```");
  } else {
    mdParts.push("```", outputStr.trim() || "(no output)", "```");
  }

  if (hasError) {
    mdParts.push("", `> Error: \`${formatError(error)}\``);
  }

  const md = mdParts.join("\n");

  return (
    <Detail
      navigationTitle="Clipaste Result"
      markdown={md}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Command" content={cmdString} />
          <Action title="Run Again" onAction={() => revalidate()} />
        </ActionPanel>
      }
    />
  );
}

function ClipboardPreviewDetail(props: {
  clip?: { text?: string; file?: string; html?: string };
  onRefresh: () => void;
}) {
  const c = props.clip;
  let md = `# Clipboard Preview\n`;
  if (!c) md += `\n(no clipboard data)\n`;
  else {
    if (c.text) md += `\n## Text\n\n\`\`\`\n${c.text}\n\`\`\`\n`;
    if (c.file) {
      const lower = c.file.toLowerCase();
      const isImage =
        lower.endsWith(".png") ||
        lower.endsWith(".jpg") ||
        lower.endsWith(".jpeg") ||
        lower.endsWith(".webp") ||
        lower.endsWith(".gif");
      md += `\n## File\n\n\`${c.file}\`\n\n`;
      if (isImage) md += `![clipboard-image](${c.file})\n`;
    }
    if (c.html) md += `\n## HTML (raw)\n\n\`\`\`html\n${c.html}\n\`\`\`\n`;
  }
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Refresh" onAction={props.onRefresh} />
          {c?.text ? (
            <Action.CopyToClipboard title="Copy Text" content={c.text} />
          ) : null}
          {c?.file ? (
            <Action.CopyToClipboard title="Copy File Path" content={c.file} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function PngpastePreviewDetail(props: { pngpastePath: string }) {
  const bin = props.pngpastePath || "pngpaste";
  const cmd = `bash -lc 'if ! command -v "${bin}" >/dev/null 2>&1; then echo "__NOPNGPASTE__"; exit 127; fi; TMP="$(mktemp -t clipaste-preview)"; OUT="\${TMP}.png"; if "${bin}" "\${OUT}"; then echo "\${OUT}"; else echo "__ERROR__"; fi'`;
  const { isLoading, data, error, revalidate } = useExec(cmd, [], {
    shell: true,
  });

  let md = `# pngpaste Preview\n`;
  if (isLoading) md += `\n(working…)\n`;
  else if (error) md += `\n**Error:** ${String(error)}\n`;
  else if (data) {
    const out = (data as string).trim();
    if (out === "__NOPNGPASTE__")
      md +=
        "\n`pngpaste` not found.\n\nInstall with:\n\n```bash\nbrew install pngpaste\n```\n";
    else if (out === "__ERROR__" || out === "")
      md +=
        "\nCould not dump clipboard image via pngpaste. Make sure the clipboard holds an image.\n";
    else md += `\nSaved to \`${out}\`.\n\n![clipboard-image](${out})\n`;
  }
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <Action title="Run Again" onAction={() => revalidate()} />
          <Action.CopyToClipboard
            title="Copy Output Path"
            content={(data ?? "").trim?.() ?? ""}
          />
        </ActionPanel>
      }
    />
  );
}

function shellQuote(s: string): string {
  if (/^[a-zA-Z0-9_/.-]+$/.test(s)) return s;
  return '"' + s.replace(/"/g, '\\"') + '"';
}

function formatError(error: unknown): string {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
