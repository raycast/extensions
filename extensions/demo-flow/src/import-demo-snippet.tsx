import { Action, ActionPanel, Form, Icon, Toast, showToast } from "@raycast/api";
import { readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { useState } from "react";
import type { Demo, Snippet } from "./types";
import { getDemos, saveDemos } from "./storage";
import { ensureUniqueDemoName } from "./utils";

type ImportValues = {
  file?: string[];
  jsonText?: string;
};

export default function ImportDemoSnippet() {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Import Demo Snippet"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import"
            icon={Icon.Upload}
            onSubmit={async (values: ImportValues) => {
              setIsLoading(true);
              try {
                const raw = await resolveImportPayload(values);
                if (!raw) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Provide a JSON file or paste JSON",
                  });
                  setIsLoading(false);
                  return;
                }
                const parsed = JSON.parse(raw);
                const demos = await getDemos();
                const imported = normalizeImport(parsed, demos);
                if (imported.length === 0) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "No valid demos found in JSON",
                  });
                  setIsLoading(false);
                  return;
                }
                await saveDemos([...demos, ...imported]);
                await showToast({
                  style: Toast.Style.Success,
                  title: `Imported ${imported.length} demo${imported.length === 1 ? "" : "s"}`,
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to import",
                  message: String(error),
                });
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="JSON File" allowMultipleSelection={false} canChooseDirectories={false} />
      <Form.TextArea id="jsonText" title="Or Paste JSON" placeholder="Paste exported demo JSON" />
    </Form>
  );
}

async function resolveImportPayload(values: ImportValues): Promise<string | null> {
  if (values.file && values.file.length > 0) {
    return readFile(values.file[0], "utf8");
  }
  if (values.jsonText && values.jsonText.trim()) {
    return values.jsonText;
  }
  return null;
}

function normalizeImport(payload: unknown, existing: Demo[]): Demo[] {
  const entries = Array.isArray(payload) ? payload : [payload];
  const demos: Demo[] = [];
  const now = Date.now();
  const existingNames = new Set(existing.map((demo) => demo.name));

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const record = entry as { name?: string; snippets?: unknown };
    const snippets = normalizeSnippets(record.snippets);
    if (snippets.length === 0) {
      continue;
    }
    const name = ensureUniqueDemoName(record.name ?? "Imported Demo", existingNames);
    existingNames.add(name);
    demos.push({
      id: randomUUID(),
      name,
      snippets,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    });
  }

  return demos;
}

function normalizeSnippets(input: unknown): Snippet[] {
  if (!Array.isArray(input)) {
    return [];
  }
  const now = Date.now();
  return input
    .map((item): Snippet | null => {
      if (typeof item === "string") {
        return { id: randomUUID(), text: item, createdAt: now, updatedAt: now };
      }
      if (item && typeof item === "object" && typeof (item as { text?: string }).text === "string") {
        return {
          id: randomUUID(),
          text: (item as { text: string }).text,
          createdAt: now,
          updatedAt: now,
        };
      }
      return null;
    })
    .filter((item): item is Snippet => Boolean(item));
}
