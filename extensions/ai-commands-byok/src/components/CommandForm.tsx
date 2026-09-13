import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { newCommand, upsertCommand } from "../lib/store";
import {
  DEFAULT_MODELS,
  MODE_LABEL,
  PROVIDER_LABEL,
  type AICommand,
  type Provider,
  type ResultMode,
} from "../lib/types";
import { ICON_CHOICES, iconFor, iconKey } from "./icons";

interface Values {
  title: string;
  icon: string;
  prompt: string;
  provider: string;
  model: string;
  mode: string;
}

interface Props {
  /** Edit this command. Omit to create a new one. */
  command?: AICommand;
  /** Pre-fill from another command (Duplicate). */
  template?: AICommand;
  onSaved?: () => void;
}

export function CommandForm({ command, template, onSaved }: Props) {
  const { pop } = useNavigation();
  const seed = command ?? template;

  const { handleSubmit, itemProps, values } = useForm<Values>({
    initialValues: {
      title: command ? command.title : template ? `${template.title} Copy` : "",
      icon: iconKey(seed?.icon ?? "Wand"),
      prompt: seed?.prompt ?? "",
      provider: seed?.provider ?? "openai",
      model: seed?.model ?? "",
      mode: seed?.mode ?? "preview",
    },
    validation: {
      title: FormValidation.Required,
      prompt: (v) => {
        if (!v?.trim()) return "Write the prompt the model should follow.";
        return undefined;
      },
    },
    async onSubmit(v) {
      const base = {
        title: v.title.trim(),
        icon: v.icon,
        prompt: v.prompt.trim(),
        provider: v.provider as Provider,
        model: v.model.trim(),
        mode: v.mode as ResultMode,
      };
      const saved: AICommand = command ? { ...command, ...base, updatedAt: Date.now() } : newCommand(base);
      await upsertCommand(saved);
      await showToast({
        style: Toast.Style.Success,
        title: command ? "Command updated" : "Command created",
        message: saved.title,
      });
      onSaved?.();
      if (command || template) pop();
      else await popToRoot();
    },
  });

  const usesSelection = values.prompt?.includes("{selection}");

  return (
    <Form
      navigationTitle={command ? `Edit ${command.title}` : "New AI Command"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={command ? "Save Changes" : "Create Command"}
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField title="Title" placeholder="Fix Spelling and Grammar" {...itemProps.title} />
      <Form.Dropdown title="Icon" {...itemProps.icon}>
        {ICON_CHOICES.map((name) => (
          <Form.Dropdown.Item key={name} value={name} title={name} icon={iconFor(name)} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        title="Prompt"
        placeholder={"Fix spelling and grammar. Reply with the corrected text only.\n\nText:\n{selection}"}
        info={
          usesSelection
            ? "{selection} will be replaced by the selected text."
            : "Tip: add {selection} where the text should go. Without it, the prompt is sent as instructions and the text follows."
        }
        enableMarkdown={false}
        {...itemProps.prompt}
      />
      <Form.Separator />
      <Form.Dropdown title="Provider" {...itemProps.provider}>
        {(Object.keys(PROVIDER_LABEL) as Provider[]).map((p) => (
          <Form.Dropdown.Item key={p} value={p} title={PROVIDER_LABEL[p]} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        title="Model"
        placeholder={DEFAULT_MODELS[(values.provider as Provider) ?? "openai"]}
        info="Leave empty to use the default model set in the extension preferences."
        {...itemProps.model}
      />
      <Form.Dropdown title="When Done" {...itemProps.mode}>
        {(Object.keys(MODE_LABEL) as ResultMode[]).map((m) => (
          <Form.Dropdown.Item key={m} value={m} title={MODE_LABEL[m]} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
