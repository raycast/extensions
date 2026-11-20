import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { IconPreview } from "./components/IconPreview";
import { parseCustomSvg } from "./lib/render";
import { applyPreset, DEFAULT_SETTINGS, describePreset, PRESETS } from "./lib/settings";

type Values = { svg: string; file: string[]; preset: string; fileName: string };

export default function Command() {
  const { push } = useNavigation();
  const { data: clipboardSvg, isLoading } = usePromise(async () => {
    const text = await Clipboard.readText();
    return text && parseCustomSvg(text) ? text : "";
  });

  function handleSubmit(values: Values) {
    const filePath = values.file?.[0];
    const source = filePath ? readFileSync(filePath, "utf8") : values.svg;
    if (!source || !parseCustomSvg(source)) {
      showToast({ style: Toast.Style.Failure, title: "Paste SVG code or pick an .svg file" });
      return;
    }
    const fileName = values.fileName || (filePath ? `${basename(filePath, ".svg")}_icon` : "extension_icon");
    const settings = {
      ...applyPreset(DEFAULT_SETTINGS, Number(values.preset)),
      icon: undefined,
      customSvg: source,
      fileName,
    };
    push(<IconPreview settings={settings} />);
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Icon" icon={Icon.Brush} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Use currentColor in your SVG so the icon color setting applies." />
      {isLoading ? null : (
        <Form.TextArea id="svg" title="SVG Code" placeholder="<svg viewBox=…>…</svg>" defaultValue={clipboardSvg} />
      )}
      <Form.FilePicker id="file" title="Or SVG File" allowMultipleSelection={false} />
      <Form.Dropdown id="preset" title="Preset" defaultValue="0">
        {PRESETS.map((preset, index) => (
          <Form.Dropdown.Item key={index} value={String(index)} title={describePreset(preset)} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="fileName" title="File Name" placeholder="extension_icon" />
    </Form>
  );
}
