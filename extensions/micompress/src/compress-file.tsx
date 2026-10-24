import { Action, ActionPanel, Clipboard, Form, Toast, showToast, popToRoot, open } from "@raycast/api";
import { basename } from "path";
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

    let inTotal = 0;
    let savedTotal = 0;
    const failures: { file: string; error: string }[] = [];

    for (const file of values.files) {
      try {
        const { meta } = await compressFile(file, values.preset);
        inTotal += meta.inputSize || 0;
        savedTotal += (meta.inputSize || 0) - (meta.outputSize || 0);
      } catch (e) {
        failures.push({ file: basename(file), error: e instanceof Error ? e.message : String(e) });
      }
    }

    setLoading(false);
    const ok = values.files.length - failures.length;
    if (failures.length === 0) {
      const pct = inTotal ? Math.round((savedTotal / inTotal) * 100) : 0;
      toast.style = Toast.Style.Success;
      toast.title = `Compressed ${ok}/${values.files.length}`;
      toast.message = `Saved ${pct}%`;
      await popToRoot();
      return;
    }

    // Keep the form open so the user can see what failed and retry.
    const details = failures.map((f) => `${f.file}: ${f.error}`).join("\n");
    toast.style = Toast.Style.Failure;
    toast.title = ok > 0 ? `Compressed ${ok}/${values.files.length}, ${failures.length} failed` : "Compression failed";
    toast.message =
      failures.length === 1 ? details : `${failures[0].file}: ${failures[0].error} (+${failures.length - 1} more)`;
    toast.primaryAction = {
      title: "Copy Error Details",
      onAction: () => Clipboard.copy(details),
    };
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
