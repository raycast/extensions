import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { useState } from "react";
import type { ModelHook } from "../../type";
import { importAgentsAsPresets, type RaycastAgent } from "../../utils/agentInterop";
import {
  countNameCollisions,
  importPresetsFromYaml,
  parsePresetYamlDocument,
  parseYamlOrJson,
  type RepeatImportPolicy,
} from "../../utils/presetYaml";
import { resolveToast } from "../../utils/toast";

/** Which file format the picked file is parsed as. */
type ImportFormat = "yaml" | "agent-json";

/**
 * Builds a one-line, human-readable summary of an import tally — shared by both formats
 * so the resulting toast reads the same regardless of which parser ran.
 */
function summarize(tally: { imported: number; replaced?: number; skipped: number; failed: number }): string {
  const parts = [`${tally.imported} imported`];
  if (tally.replaced) parts.push(`${tally.replaced} replaced`);
  if (tally.skipped) parts.push(`${tally.skipped} skipped`);
  if (tally.failed) parts.push(`${tally.failed} failed`);
  return parts.join(", ");
}

/** Detects the format from the parsed JSON/YAML shape: a bare array is Agent JSON. */
function detectFormat(parsed: unknown): ImportFormat {
  return Array.isArray(parsed) ? "agent-json" : "yaml";
}

export const ModelImportForm = (props: { use: { models: ModelHook } }) => {
  const { use } = props;
  const { pop } = useNavigation();
  const [files, setFiles] = useState<string[]>([]);

  const handleSubmit = async (values: { files: string[]; onConflict: RepeatImportPolicy }) => {
    const [path] = values.files;
    if (!path) {
      // Copy Error carries the guidance rather than an exception string — there is no
      // underlying error here, but House Style is that every Failure toast is copyable,
      // and a mechanical exception invites the next audit to skip a real one.
      const message = "Choose a file to import.";
      await showToast({
        style: Toast.Style.Failure,
        title: "Choose a file to import",
        primaryAction: {
          title: "Copy Error",
          onAction: async () => {
            await Clipboard.copy(message);
          },
        },
      });
      return;
    }

    const toast = await showToast({ title: "Importing presets...", style: Toast.Style.Animated });

    try {
      const text = await readFile(path, "utf-8");

      // One parse for the whole import: `parseYamlOrJson` is the same `js-yaml` load
      // both the format-detection probe below and `parsePresetYamlDocument` need (YAML
      // is a superset of JSON, so one loader handles both file types) — the file is
      // never parsed twice.
      let parsedShape: unknown;
      try {
        parsedShape = parseYamlOrJson(text);
      } catch {
        throw new Error("File is not valid YAML or JSON.");
      }

      const format = detectFormat(parsedShape);

      if (format === "agent-json") {
        const defaultModel = use.models.data.find((m) => m.id === "default") ?? use.models.data[0];
        if (!defaultModel) throw new Error("No default preset available to fall back to.");

        const result = importAgentsAsPresets(parsedShape as RaycastAgent[], use.models.availableModels, defaultModel);

        for (const model of result.models) {
          await use.models.add(model);
        }

        const agentWarnings = result.outcomes.flatMap((o) => ("warning" in o && o.warning ? [o.warning] : []));

        // Hide-and-reshow rather than mutating the live toast — see `src/utils/toast.ts`.
        await resolveToast(toast, {
          style: result.tally.failed > 0 ? Toast.Style.Failure : Toast.Style.Success,
          title: "Raycast Agent import complete",
          message:
            agentWarnings.length > 0
              ? `${summarize(result.tally)} — ${agentWarnings.length} ${agentWarnings.length === 1 ? "warning" : "warnings"}`
              : summarize(result.tally),
          primaryAction:
            agentWarnings.length > 0
              ? {
                  title: "Copy Warnings",
                  onAction: async () => {
                    await Clipboard.copy(agentWarnings.join("\n"));
                  },
                }
              : undefined,
        });

        pop();
        return;
      }

      const rawRows = parsePresetYamlDocument(parsedShape);
      const collisions = countNameCollisions(rawRows, use.models.data);
      const policy: RepeatImportPolicy = collisions > 0 ? values.onConflict : "skip";

      const defaultModel = use.models.data.find((m) => m.id === "default") ?? use.models.data[0];
      if (!defaultModel) throw new Error("No default preset available to fall back to.");

      const result = importPresetsFromYaml(rawRows, use.models.data, use.models.availableModels, defaultModel, policy);

      for (const outcome of result.outcomes) {
        if (outcome.status === "imported" || outcome.status === "replaced") {
          await use.models.update(outcome.model);
        }
      }

      const warnings = result.outcomes.flatMap((o) => ("warning" in o && o.warning ? [o.warning] : []));

      // Hide-and-reshow rather than mutating the live toast — see `src/utils/toast.ts`.
      await resolveToast(toast, {
        style: result.tally.failed > 0 ? Toast.Style.Failure : Toast.Style.Success,
        title: "Preset import complete",
        message:
          warnings.length > 0
            ? `${summarize(result.tally)} — ${warnings.length} ${warnings.length === 1 ? "warning" : "warnings"}`
            : summarize(result.tally),
        primaryAction:
          warnings.length > 0
            ? {
                title: "Copy Warnings",
                onAction: async () => {
                  await Clipboard.copy(warnings.join("\n"));
                },
              }
            : undefined,
      });

      pop();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await resolveToast(toast, {
        style: Toast.Style.Failure,
        title: "Import failed",
        message,
        primaryAction: {
          title: "Copy Error",
          onAction: async () => {
            await Clipboard.copy(message);
          },
        },
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" icon={Icon.Upload} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Import Presets"
        text={
          "Choose a native Claude presets YAML file, or a Raycast Agent export (.json). " +
          "Raycast Agent import is provisional: the format was reconstructed from sample exports, so an agent file whose shape differs may import incompletely."
        }
      />
      <Form.FilePicker
        id="files"
        title="File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        value={files}
        onChange={setFiles}
      />
      <Form.Dropdown id="onConflict" title="On Name Conflict" defaultValue="skip" info="Only applies to YAML imports.">
        <Form.Dropdown.Item value="skip" title="Skip (keep existing preset)" />
        <Form.Dropdown.Item value="replace" title="Replace existing preset" />
      </Form.Dropdown>
    </Form>
  );
};
