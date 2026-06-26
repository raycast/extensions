import { Action, ActionPanel, Form, Icon, Toast, open, popToRoot, showHUD, showToast } from "@raycast/api";
import { readFile, writeFile } from "fs/promises";
import { basename, dirname, join } from "path";
import { useState } from "react";
import { reorderConcatenated } from "./lib/pdf";
import { defaultSaveDir, getPrefs } from "./lib/util";

interface FormValues {
  file: string[];
  backOrder: string;
}

export default function Command() {
  const prefs = getPrefs();
  const [fileError, setFileError] = useState<string>();

  async function onSubmit(values: FormValues) {
    const input = values.file?.[0];
    if (!input) {
      setFileError("Pick a PDF to reorder.");
      return;
    }
    const toast = await showToast({ style: Toast.Style.Animated, title: "Reordering pages…" });
    try {
      const bytes = new Uint8Array(await readFile(input));
      const reordered = await reorderConcatenated(bytes, values.backOrder === "reversed");

      const base = basename(input).replace(/\.pdf$/i, "");
      const folder = prefs.saveDirectory?.trim() ? prefs.saveDirectory : dirname(input) || defaultSaveDir(prefs);
      const out = join(folder, `${base}-ordered.pdf`);
      await writeFile(out, reordered);

      toast.style = Toast.Style.Success;
      toast.title = "Saved reordered PDF";
      toast.message = out;
      if (prefs.openAfterSave) await open(out);
      await showHUD("Saved reordered PDF");
      await popToRoot();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not reorder PDF";
      toast.message = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Reorder & Save" icon={Icon.Shuffle} onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Reorder Scanned PDF"
        text="Turns a concatenated front/back PDF (all fronts, then all backs) into correct page order."
      />
      <Form.FilePicker
        id="file"
        title="PDF File"
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={fileError}
        onChange={() => setFileError(undefined)}
      />
      <Form.Dropdown id="backOrder" title="Back Pages Order" defaultValue="forward">
        <Form.Dropdown.Item value="forward" title="Forward (1,3,5… then 2,4,6…)" />
        <Form.Dropdown.Item value="reversed" title="Reversed (backs scanned after flipping the stack)" />
      </Form.Dropdown>
    </Form>
  );
}
