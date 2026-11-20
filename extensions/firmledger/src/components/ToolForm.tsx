import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { Args } from "../lib/core";
import { Arg, FIELD_LABELS, TOOL_MAP, coerceArgs } from "../lib/tools";
import { ToolResult } from "./ToolResult";

interface Props {
  toolName: string;
  /** Arguments fixed by the caller (hidden from the form). */
  preset?: Args;
  /** Initial values for visible fields. */
  defaults?: Record<string, string | boolean | undefined>;
  title?: string;
}

const human = (s: string) => s.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function Field({ a, def }: { a: Arg; def?: string | boolean }) {
  const title = (FIELD_LABELS[a.name] ?? human(a.name)) + (a.req ? " *" : "");
  const id = a.name;
  switch (a.type) {
    case "bool":
      return <Form.Checkbox id={id} title={title} label={a.desc ?? human(a.name)} defaultValue={def === true} />;
    case "enum":
      return (
        <Form.Dropdown id={id} title={title} defaultValue={typeof def === "string" ? def : a.req ? a.opts![0] : ""} info={a.desc}>
          {!a.req && <Form.Dropdown.Item value="" title="(not set)" />}
          {a.opts!.map((o) => (
            <Form.Dropdown.Item key={o} value={o} title={o} />
          ))}
        </Form.Dropdown>
      );
    case "text":
    case "list":
    case "json":
      return <Form.TextArea id={id} title={title} placeholder={a.desc} defaultValue={typeof def === "string" ? def : undefined} />;
    default:
      return <Form.TextField id={id} title={title} placeholder={a.desc} defaultValue={typeof def === "string" ? def : undefined} />;
  }
}

/** Auto-generated form for any tool; submit pushes a ToolResult (which handles confirmation). */
export function ToolForm({ toolName, preset = {}, defaults = {}, title }: Props) {
  const def = TOOL_MAP[toolName];
  const { push } = useNavigation();
  const fields = def.args.filter((a) => !(a.name in preset));

  const required = fields.filter((a) => a.req);
  const optional = fields.filter((a) => !a.req);

  async function submit(values: Record<string, unknown>) {
    try {
      const args = { ...preset, ...coerceArgs({ ...def, args: fields }, values) };
      push(<ToolResult toolName={toolName} args={args} />);
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Check the form", message: e instanceof Error ? e.message : String(e) });
    }
  }

  const presetNote = Object.keys(preset).length
    ? `  ·  ${Object.entries(preset)
        .map(([k, v]) => `${k}=${String(v)}`)
        .join(", ")}`
    : "";
  return (
    <Form
      navigationTitle={title ?? def.title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={def.group === "account_write" ? "Prepare (You Confirm Next)" : "Run"}
            icon={Icon.Play}
            onSubmit={submit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={`LEDGER · ${def.title.toUpperCase()}`}
        text={`${def.desc}${presetNote}${def.group === "account_write" ? "\nNothing happens until you confirm the exact summary." : ""}`}
      />
      <Form.Separator />
      {required.map((a) => (
        <Field key={`${toolName}:${a.name}`} a={a} def={defaults[a.name]} />
      ))}
      {required.length > 0 && optional.length > 0 && <Form.Separator />}
      {optional.map((a) => (
        <Field key={`${toolName}:${a.name}`} a={a} def={defaults[a.name]} />
      ))}
    </Form>
  );
}
