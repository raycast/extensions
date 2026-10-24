import { Action, ActionPanel, Form, Toast, showToast, popToRoot, open } from "@raycast/api";
import { useState } from "react";
import { compressFile, SITE } from "./api";

interface Values {
  files: string[];
  preset: string;
}

export default function Command() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(values: Values) {
    if (!values.files || values.files.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Select at least one file" });
      return;
    }
    setLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Compressing…" });

    let ok = 0;
    let inTotal = 0;
    let savedTotal = 0;
    const errors: string[] = [];

    for (const file of values.files) {
      try {
        const { meta } = await compressFile(file, values.preset);
        ok += 1;
        inTotal += meta.inputSize || 0;
        savedTotal += (meta.inputSize || 0) - (meta.outputSize || 0);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }

    setLoading(false);
    if (ok > 0) {
      const pct = inTotal ? Math.round((savedTotal / inTotal) * 100) : 0;
      toast.style = Toast.Style.Success;
      toast.title = `Compressed ${ok}/${values.files.length}`;
      toast.message = `Saved ${pct}%${errors.length ? ` · ${errors.length} failed` : ""}`;
      await popToRoot();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Compression failed";
      toast.message = errors[0];
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Compress" onSubmit={onSubmit} />
          <Action title="Open MiCompress Website" onAction={() => open(SITE)} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Files" allowMultipleSelection />
      <Form.Dropdown id="preset" title="Preset" defaultValue="recommended">
        <Form.Dropdown.Item value="lossless" title="Lossless" />
        <Form.Dropdown.Item value="recommended" title="Recommended" />
        <Form.Dropdown.Item value="extreme" title="Extreme" />
      </Form.Dropdown>
      <Form.Description text="Images, PDFs, video, audio, documents & archives — powered by micompress.com" />
    </Form>
  );
}
