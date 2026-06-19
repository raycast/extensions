import {
  Detail,
  ActionPanel,
  Action,
  Clipboard,
  Toast,
  environment,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { useEffect, useState } from "react";
import { ocrFiles } from "swift:../swift";
import { save_history } from "./ocr-history";

type OutputAction = "copy" | "paste";

type Preferences = {
  primary_language?: string;
  extra_languages?: string;
  level?: "fast" | "accurate";
  output_action?: OutputAction;
};

type State = {
  is_loading: boolean;
  text: string;
  error?: string;
};

export function VisionOCRResult({ paths }: { paths?: string[] }) {
  const [state, set_state] = useState<State>({ is_loading: true, text: "" });

  useEffect(() => {
    if (!paths) return;

    if (paths.length === 0) {
      set_state({ is_loading: false, text: "", error: "No files provided" });
      return;
    }

    const options = get_ocr_options();
    ocrFiles(paths, options.languages, options.level)
      .then(async (text) => {
        set_state({ is_loading: false, text });
        if (text.trim()) {
          await Clipboard.copy(text);
          await save_history(text);
          await showToast({
            style: Toast.Style.Success,
            title: "OCR copied to clipboard",
          });
        } else {
          await showToast({
            style: Toast.Style.Success,
            title: "OCR finished",
            message: "No text found",
          });
        }
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : String(error);
        set_state({ is_loading: false, text: "", error: message });
        await showToast({
          style: Toast.Style.Failure,
          title: "OCR failed",
          message,
        });
      });
  }, [paths?.join("\n")]);

  return (
    <VisionOCRDetail
      is_loading={state.is_loading}
      text={state.text}
      error={state.error}
      paths={paths}
    />
  );
}

export function VisionOCRDetail({
  is_loading = false,
  text,
  error,
  paths,
}: {
  is_loading?: boolean;
  text: string;
  error?: string;
  paths?: string[];
}) {
  const markdown = error
    ? `# OCR failed\n\n${code_block(error)}`
    : text.trim()
      ? code_block(text)
      : is_loading
        ? "# Running OCR..."
        : "# No text found";

  return (
    <Detail
      isLoading={is_loading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy OCR Text" content={text} />
          <Action.Paste
            title="Paste OCR Text"
            content={text}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Save OCR Text"
            onAction={() => save_text(text)}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          {paths?.[0] ? (
            <Action.ShowInFinder
              path={paths[0]}
              title="Show Original in Finder"
            />
          ) : null}
          {paths?.[0] ? (
            <Action.Open target={paths[0]} title="Open Original" />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export async function apply_ocr_output(
  text: string,
  output_action: OutputAction,
) {
  if (output_action === "paste") {
    await Clipboard.paste(text);
    return "pasted";
  }

  await Clipboard.copy(text);
  return "copied";
}

export async function save_text(text: string) {
  if (!text.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "No text to save" });
    return;
  }

  const dir = path.join(environment.supportPath, "exports");
  await mkdir(dir, { recursive: true });
  const file = path.join(
    dir,
    `vision-ocr-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`,
  );
  await writeFile(file, text);
  await showToast({
    style: Toast.Style.Success,
    title: "OCR text saved",
    message: file,
  });
}

export function get_ocr_options() {
  const preferences = getPreferenceValues<Preferences>();
  const primary_language =
    preferences.primary_language && preferences.primary_language !== "auto"
      ? [preferences.primary_language]
      : [];

  return {
    languages: [
      ...primary_language,
      ...parse_languages(preferences.extra_languages ?? ""),
    ],
    level: preferences.level ?? "accurate",
    output_action: preferences.output_action ?? "copy",
  };
}

export function parse_languages(value: string) {
  return value
    .split(/[,\s]+/)
    .map((language) => language.trim())
    .filter(Boolean);
}

function code_block(value: string) {
  return `\`\`\`text\n${value.replaceAll("```", "`\\`\\`")}\n\`\`\``;
}
