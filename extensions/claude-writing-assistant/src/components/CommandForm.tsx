import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { isModelId, MODEL_IDS, MODELS } from "../lib/models";
import { saveCustomCommand } from "../lib/custom-commands";
import { AiCommand, MODE_TITLES, OutputMode } from "../lib/presets";

const ICONS: { key: keyof typeof Icon; title: string }[] = [
  { key: "Wand", title: "Wand" },
  { key: "Stars", title: "Stars" },
  { key: "Text", title: "Text" },
  { key: "Pencil", title: "Pencil" },
  { key: "Paragraph", title: "Paragraph" },
  { key: "BulletPoints", title: "List" },
  { key: "CheckList", title: "Checklist" },
  { key: "Envelope", title: "Envelope" },
  { key: "Message", title: "Message" },
  { key: "Code", title: "Code" },
  { key: "Terminal", title: "Terminal" },
  { key: "Bug", title: "Bug" },
  { key: "Globe", title: "Globe" },
  { key: "LightBulb", title: "Light Bulb" },
  { key: "Book", title: "Book" },
  { key: "Tag", title: "Tag" },
  { key: "Hashtag", title: "Hashtag" },
  { key: "Document", title: "Document" },
  { key: "Brush", title: "Brush" },
  { key: "Calendar", title: "Calendar" },
];

export function commandIcon(key: string): Icon {
  return (Icon as Record<string, Icon>)[key] ?? Icon.Wand;
}

interface Values extends Form.Values {
  title: string;
  prompt: string;
  mode: string;
  model: string;
  icon: string;
}

/** Create, edit, or (with `duplicate`) copy a command into a new custom one. */
export function CommandForm(props: { command?: AiCommand; duplicate?: boolean; onSave: () => void }) {
  const { pop } = useNavigation();
  const source = props.command;
  const editing = !!source && !props.duplicate && !source.builtin;

  const { handleSubmit, itemProps } = useForm<Values>({
    initialValues: {
      title: source ? (editing ? source.title : `${source.title} Copy`) : "",
      prompt: source?.prompt ?? "",
      mode: source?.mode ?? "view",
      model: source?.model ?? "",
      icon: source?.icon ?? "Wand",
    },
    validation: { title: FormValidation.Required, prompt: FormValidation.Required },
    async onSubmit(values) {
      await saveCustomCommand({
        id: editing && source ? source.id : undefined,
        title: values.title.trim(),
        prompt: values.prompt.trim(),
        mode: values.mode as OutputMode,
        model: isModelId(values.model) ? values.model : undefined,
        effort: source?.effort,
        icon: values.icon,
        group: "My Commands",
      });
      await showToast({ style: Toast.Style.Success, title: editing ? "Command updated" : "Command added" });
      props.onSave();
      pop();
    },
  });

  return (
    <Form
      navigationTitle={editing ? "Edit Command" : "New AI Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Command" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="e.g. Turn into Tweet" {...itemProps.title} />
      <Form.TextArea
        title="Instruction"
        placeholder="e.g. Turn this text into a fluent tweet under 280 characters."
        info="Tell Claude what to do. You can write the instruction in any language."
        {...itemProps.prompt}
      />
      <Form.Description
        title="Placeholders"
        text="{selection} selected text · {clipboard} clipboard · {language} primary language · {target} second language. Without {selection}, the selected text is attached automatically."
      />
      <Form.Dropdown title="Output" {...itemProps.mode}>
        {(Object.keys(MODE_TITLES) as OutputMode[]).map((mode) => (
          <Form.Dropdown.Item key={mode} value={mode} title={MODE_TITLES[mode]} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Model" {...itemProps.model}>
        <Form.Dropdown.Item value="" title="Default" />
        {MODEL_IDS.map((id) => (
          <Form.Dropdown.Item key={id} value={id} title={MODELS[id].name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {ICONS.map((icon) => (
          <Form.Dropdown.Item key={icon.key} value={icon.key} title={icon.title} icon={Icon[icon.key]} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
