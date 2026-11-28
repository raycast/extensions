import { useMemo, useState } from "react";
import { Form, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { formatJson, detectJson } from "./lib/pure";
import { usePrefill } from "./lib/prefill";
import { RadioGroup, type RadioOption } from "./lib/radio";

type Indent = "0" | "2" | "4";

const INDENTS = [
  { value: "2", label: "2-space indent" },
  { value: "4", label: "4-space indent" },
  { value: "0", label: "Minify (no whitespace)" },
] satisfies RadioOption<Indent>[];

export default function Command() {
  const prefill = usePrefill(detectJson);
  const [raw, setRaw] = useState("");
  const [indent, setIndent] = useState<Indent>("2");
  const [sort, setSort] = useState(false);
  const [originText, setOriginText] = useState<string | null>(null);

  // 预填到达时注入输入并维持载入提示（与迁移前行为一致）
  useMemo(() => {
    if (prefill && !raw) {
      setRaw(prefill);
      setOriginText(prefill);
    }
  }, [prefill]);

  const outcome = useMemo(() => (raw.trim() ? formatJson(raw, Number(indent), sort) : null), [raw, indent, sort]);

  // Validate摘要
  let info: string;
  if (!outcome) info = "";
  else if (outcome.ok) {
    const bytes = outcome.text.length;
    info = `✓ Valid JSON · ${bytes} chars · ${indent === "0" ? "minified" : indent + "-space indent"}${sort ? " · keys sorted" : ""}`;
  } else {
    const { line, column, message } = outcome.error!;
    info = `✗ ${message}${line ? ` (line ${line}, col ${column})` : ""}`;
  }

  return (
    <Form
      isLoading={false}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={outcome?.ok ? outcome.text : ""}
            onCopy={async () => {
              if (!outcome?.ok) {
                await showToast(Toast.Style.Failure, "Invalid JSON, nothing to copy");
                return;
              }
              await showToast(Toast.Style.Success, "Formatted result copied");
            }}
          />
          <Action.Paste
            title="Paste to Frontmost App"
            content={outcome?.ok ? outcome.text : ""}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Copy Error Message"
            icon={Icon.ExclamationMark}
            onAction={async () => {
              if (outcome && !outcome.ok) {
                await showToast(Toast.Style.Success, "Error message copied", outcome.error?.message);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <RadioGroup id="json-indent" title="Indent" value={indent} options={INDENTS} onChange={setIndent} />

      <Form.Checkbox id="sort" title="" label="Sort keys recursively" value={sort} onChange={setSort} storeValue />

      <Form.Separator />

      <Form.TextArea
        id="raw"
        title="JSON Input"
        placeholder='Paste JSON, e.g. {"a":1}'
        value={raw}
        onChange={setRaw}
        enableMarkdown={false}
      />

      <Form.Separator />

      <Form.TextArea
        id="pretty"
        title={outcome?.ok === false ? "Error" : "Result"}
        info={info}
        value={outcome?.ok ? outcome.text : ""}
        onChange={() => {
          /* 结果区只读 */
        }}
        enableMarkdown={false}
      />
      {originText ? <Form.Description text={`Auto-loaded from selection (${originText.length} chars)`} /> : null}
    </Form>
  );
}
