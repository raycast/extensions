import {
  Action,
  ActionPanel,
  Form,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import {
  createMode,
  updateMode,
  validateEditingMode,
  type EditingMode,
  type Provider,
} from "./modes";
import { getUiStrings } from "./i18n";
import { PROVIDER_REGISTRY } from "./provider-registry";

type FormValues = {
  title: string;
  description: string;
  provider: Provider;
  model: string;
  systemPrompt: string;
  temperature: string;
  maxTokens: string;
};

type ModeFormProps = {
  mode?: EditingMode;
  onSaved: () => Promise<unknown> | unknown;
};

export default function ModeForm({ mode, onSaved }: ModeFormProps) {
  const { pop } = useNavigation();
  const ui = getUiStrings();

  async function save(values: FormValues) {
    try {
      const validated = validateEditingMode({
        id: mode?.id ?? "new-mode",
        title: values.title,
        description: values.description,
        provider: values.provider,
        model: values.model,
        systemPrompt: values.systemPrompt,
        temperature: Number(values.temperature),
        maxTokens: Number(values.maxTokens),
      });

      if (mode) {
        await updateMode(validated);
      } else {
        await createMode({
          title: validated.title,
          description: validated.description,
          provider: validated.provider,
          model: validated.model,
          systemPrompt: validated.systemPrompt,
          temperature: validated.temperature,
          maxTokens: validated.maxTokens,
        });
      }
      await onSaved();
      await pop();
    } catch (reason) {
      await showToast({
        style: Toast.Style.Failure,
        title: ui.modeFormInvalid,
        message: String(reason),
      });
    }
  }

  return (
    <Form
      navigationTitle={mode ? ui.editMode : ui.newMode}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={ui.save} onSubmit={save} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title={ui.title} defaultValue={mode?.title} />
      <Form.TextField
        id="description"
        title={ui.description}
        defaultValue={mode?.description}
      />
      <Form.Dropdown
        id="provider"
        title={ui.provider}
        defaultValue={mode?.provider ?? "ollama"}
      >
        {PROVIDER_REGISTRY.map(({ id, title }) => (
          <Form.Dropdown.Item key={id} value={id} title={title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="model"
        title={ui.model}
        defaultValue={mode?.model ?? "qwen3:14b"}
      />
      <Form.TextArea
        id="systemPrompt"
        title={ui.systemPrompt}
        defaultValue={mode?.systemPrompt}
      />
      <Form.TextField
        id="temperature"
        title={ui.temperature}
        defaultValue={String(mode?.temperature ?? 0.2)}
      />
      <Form.TextField
        id="maxTokens"
        title={ui.maxTokens}
        defaultValue={String(mode?.maxTokens ?? 4096)}
      />
    </Form>
  );
}
