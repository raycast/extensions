import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { ocrClipboard, ocrFiles } from "swift:../swift";
import { apply_ocr_output, parse_languages, VisionOCRDetail } from "./ocr";
import { save_history } from "./ocr-history";

type Values = {
  source: "clipboard" | "paths";
  paths?: string[];
  extra_languages?: string;
  level: "accurate" | "fast";
  output_action: "show" | "copy" | "paste";
};

export default function Command() {
  const [result, set_result] = useState<{ text: string; paths?: string[] }>();

  if (result)
    return <VisionOCRDetail text={result.text} paths={result.paths} />;

  async function submit(values: Values) {
    try {
      const languages = parse_languages(values.extra_languages ?? "");
      const paths =
        values.source === "paths" ? (values.paths ?? []) : undefined;
      const text =
        values.source === "clipboard"
          ? await ocrClipboard(languages, values.level)
          : await ocrFiles(paths ?? [], languages, values.level);

      await save_history(text);

      if (values.output_action === "show") {
        set_result({ text, paths });
      } else if (!text.trim()) {
        await showToast({ style: Toast.Style.Failure, title: "No text found" });
      } else {
        const verb = await apply_ocr_output(text, values.output_action);
        await showToast({
          style: Toast.Style.Success,
          title: `OCR text ${verb}`,
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OCR failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run OCR" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="source" title="Source" defaultValue="clipboard">
        <Form.Dropdown.Item value="clipboard" title="Clipboard" />
        <Form.Dropdown.Item value="paths" title="Files" />
      </Form.Dropdown>
      <Form.FilePicker
        id="paths"
        title="Files"
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection
      />
      <Form.TextField
        id="extra_languages"
        title="Languages"
        placeholder="BCP-47 tags, for example: en-US, ar"
      />
      <Form.Dropdown
        id="level"
        title="Recognition Level"
        defaultValue="accurate"
      >
        <Form.Dropdown.Item value="accurate" title="Accurate" />
        <Form.Dropdown.Item value="fast" title="Fast" />
      </Form.Dropdown>
      <Form.Dropdown id="output_action" title="Output" defaultValue="show">
        <Form.Dropdown.Item value="show" title="Show Result" />
        <Form.Dropdown.Item value="copy" title="Copy to Clipboard" />
        <Form.Dropdown.Item value="paste" title="Paste into Frontmost App" />
      </Form.Dropdown>
    </Form>
  );
}
