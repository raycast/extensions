import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { ActionOpenPreferences } from "./components/action-open-preferences";
import useCodeConverter from "./hooks/use-code-converter";

export default function CodeConverter() {
  const converter = useCodeConverter();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Native"
            content={converter.get("native")}
            shortcut={{ modifiers: ["cmd"], key: "1" }}
          />
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Unicode"
              content={converter.get("unicode")}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
            <Action.CopyToClipboard
              title="Copy Base64"
              content={converter.get("base64")}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
            />
            <Action.CopyToClipboard
              title="Copy Utf-8"
              content={converter.get("utf8")}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
            />
            <Action.CopyToClipboard
              title="Copy Ascii"
              content={converter.get("ascii")}
              shortcut={{ modifiers: ["cmd"], key: "5" }}
            />
            <Action.CopyToClipboard
              title="Copy Hex"
              content={converter.get("hex")}
              shortcut={{ modifiers: ["cmd"], key: "6" }}
            />
            <Action.CopyToClipboard
              title="Copy Decimal"
              content={converter.get("decimal")}
              shortcut={{ modifiers: ["cmd"], key: "7" }}
            />
            <Action.CopyToClipboard
              title="Copy Encoded URL"
              content={converter.get("url")}
              shortcut={{ modifiers: ["cmd"], key: "8" }}
            />
            <Action.CopyToClipboard
              title="Copy Entity"
              content={converter.get("entity")}
              shortcut={{ modifiers: ["cmd"], key: "9" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title="Clear All"
              shortcut={{ modifiers: ["shift", "cmd"], key: "backspace" }}
              onAction={converter.reset}
            />
          </ActionPanel.Section>
          <ActionOpenPreferences showCommandPreferences={true} showExtensionPreferences={true} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="Native"
        title="Native"
        value={converter.get("native")}
        placeholder="String"
        onChange={(v) => converter.set("native", v)}
      />
      <Form.TextField
        id="Unicode"
        title="Unicode"
        value={converter.get("unicode")}
        placeholder="\\u0031"
        onChange={(v) => converter.set("unicode", v)}
      />
      <Form.TextField
        id="Base64"
        title="Base64"
        value={converter.get("base64")}
        placeholder="MQ=="
        onChange={(v) => converter.set("base64", v)}
      />
      <Form.TextField
        id="UTF-8"
        title="UTF-8"
        value={converter.get("utf8")}
        placeholder="\\xE4\\xBD\\xA0\\xE5\\xA5\\xBD"
        info="Letters and numbers will not be transcode to UTF-8"
        onChange={(v) => converter.set("utf8", v)}
      />
      <Form.TextField
        id="ASCII"
        title="ASCII"
        value={converter.get("ascii")}
        placeholder="Number"
        info="Only ASCII greater than 13 is supported"
        onChange={(v) => converter.set("ascii", v)}
      />
      <Form.TextField
        id="Hex"
        title="Hex"
        value={converter.get("hex")}
        placeholder="0x0"
        onChange={(v) => converter.set("hex", v)}
      />
      <Form.TextField
        id="Decimal"
        title="Decimal"
        value={converter.get("decimal")}
        placeholder="0"
        onChange={(v) => converter.set("decimal", v)}
      />
      <Form.TextField
        id="Encoded URL"
        title="Encoded URL"
        value={converter.get("url")}
        placeholder="https%3A%2F%2Fwww.raycast.com"
        info="URLs encoded with encodeURIComponent"
        onChange={(v) => converter.set("url", v)}
      />
      <Form.TextField
        id="HTML entity"
        title="HTML entity"
        value={converter.get("entity")}
        placeholder="&#xXXXX;"
        info="HTML entity encoded with &#xXXXX;"
        onChange={(v) => converter.set("entity", v)}
      />
    </Form>
  );
}
