import { Action, ActionPanel, Clipboard, Detail, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { readFile, stat } from "node:fs/promises";
import { useState } from "react";
import { IMAGE_WIDTHS, MAX_IMAGE_BYTES, imageToAscii, imageToDots } from "./image-art";

export default function ImageCommand() {
  const [files, setFiles] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const { push } = useNavigation();

  async function fromClipboard() {
    try {
      const content = await Clipboard.read();
      if (content.file) {
        setFiles([content.file]);
        setError(undefined);
      } else {
        setError("Copy an image file or choose one below. Save raw clipboard screenshots as PNG first.");
      }
    } catch {
      setError("Could not read the clipboard. Choose an image file instead.");
    }
  }

  async function submit(values: { width: string; invert: boolean; style: string }) {
    if (busy) return;
    if (!files[0]) {
      setError("Choose a PNG or JPEG image.");
      return;
    }
    setBusy(true);
    try {
      const info = await stat(files[0]);
      if (!info.isFile()) throw new Error("Choose an image file, not a folder.");
      if (info.size > MAX_IMAGE_BYTES) throw new Error("Choose an image smaller than 20 MB.");
      const render = values.style === "dots" ? imageToDots : imageToAscii;
      const output = await render(await readFile(files[0]), Number(values.width), values.invert);
      push(
        <Detail
          navigationTitle={values.style === "dots" ? "Unicode Dots Preview" : "ASCII Preview"}
          markdown={output
            .split("\n")
            .map((line) => `    ${line}`)
            .join("\n")}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Art" content={output} />
            </ActionPanel>
          }
        />,
      );
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not convert image",
        message: error instanceof Error ? error.message : "Try a PNG or JPEG image.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Form
      navigationTitle="Image to Text Art"
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Preview Art" icon={Icon.Eye} onSubmit={submit} />
          <Action title="Use Copied Image File" icon={Icon.Clipboard} onAction={fromClipboard} />
        </ActionPanel>
      }
    >
      <Form.Description text="Turn a photo, logo, or emoji image into ASCII or Unicode dot art. Simple shapes and strong contrast work best." />
      <Form.FilePicker
        id="image"
        title="Image"
        value={files}
        allowMultipleSelection={false}
        canChooseDirectories={false}
        error={error}
        onChange={(value) => {
          setFiles(value);
          setError(undefined);
        }}
      />
      <Form.Dropdown id="style" title="Style" defaultValue="dots">
        <Form.Dropdown.Item value="dots" title="Unicode Dots (finer detail)" />
        <Form.Dropdown.Item value="ascii" title="ASCII Art" />
      </Form.Dropdown>
      <Form.Dropdown id="width" title="Detail" defaultValue={String(IMAGE_WIDTHS.Compact)}>
        {Object.entries(IMAGE_WIDTHS).map(([title, width]) => (
          <Form.Dropdown.Item key={title} title={`${title} (${width} columns)`} value={String(width)} />
        ))}
      </Form.Dropdown>
      <Form.Checkbox id="invert" title="Contrast" label="Invert light and dark" defaultValue={false} />
      <Form.Description text="Processed locally. Copy the preview with Enter and paste into a code block. Escape returns here to adjust." />
    </Form>
  );
}
