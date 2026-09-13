import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { FormValidation, useForm, usePromise } from "@raycast/utils";
import * as React from "react";
import { Creativity, ThinkingEffort } from "../enum";
import { GetModels, isThinkingModel } from "./function";
import { ValidationKeepAlive } from "./valitadion";
import { InfoKeepAlive } from "./info";
import { CustomCommand } from "../settings/types";
import {
  GetCustomCommands,
  getCustomCommandQuicklink,
  getUniqueSlug,
  SaveCustomCommand,
  slugify,
} from "../settings/settings";
import { isCustomServer } from "../providers/unified-provider";

interface Props {
  command?: CustomCommand;
  revalidate?: () => void;
  onSaved?: (command: CustomCommand) => void;
}

interface FormData {
  title: string;
  server: string;
  model: string;
  creativity: string;
  thinking: string;
  action: string;
  prompt: string;
  keep_alive: string;
}

export function CustomCommandForm(props: Props): React.JSX.Element {
  const { pop } = useNavigation();
  const [createdCommand, setCreatedCommand] = React.useState<CustomCommand | null>(null);

  const { data: existingCommands } = usePromise(GetCustomCommands, []);

  const { data: Model, isLoading: IsLoadingModel } = usePromise(GetModels, [], {
    onData: (data) => {
      if (!props.command) {
        if (!itemProps.server.value && data.size > 0) {
          const firstServer = [...data.keys()].sort()[0];
          setValue("server", firstServer);
          const models = data.get(firstServer);
          if (models && models.length > 0) {
            setValue("model", models[0].name);
          }
        }
        return;
      }
      if (data.has(props.command.server)) {
        setValue("server", props.command.server);
        const models = data.get(props.command.server);
        if (models?.some((m) => m.name === props.command?.model)) {
          setValue("model", props.command.model);
        }
      }
    },
  });

  const { handleSubmit, itemProps, setValue } = useForm<FormData>({
    onSubmit(values) {
      Submit(values);
    },
    initialValues: {
      title: props.command?.title ?? "",
      server: props.command?.server ?? "",
      model: props.command?.model ?? "",
      creativity: String(props.command?.creativity ?? Creativity.Medium),
      thinking: props.command?.thinking ?? String(ThinkingEffort.None),
      action: props.command?.action ?? "view",
      prompt: props.command?.prompt ?? "",
      keep_alive: props.command?.keep_alive ?? "5m",
    },
    validation: {
      title: (value) => {
        if (!value || value.trim() === "") return "The item is required";
        const slug = slugify(value);
        if (!slug) return "Title must contain valid alphanumeric characters";
        const isDuplicate = existingCommands?.some((c) => c.id === slug && c.id !== props.command?.id);
        if (isDuplicate) {
          return `A command with quicklink ID "${slug}" already exists. Please choose a unique title.`;
        }
      },
      server: FormValidation.Required,
      model: FormValidation.Required,
      prompt: FormValidation.Required,
      action: FormValidation.Required,
      keep_alive: (value) => ValidationKeepAlive(CheckboxAdvanced, value),
    },
  });

  const [CheckboxAdvanced, SetCheckboxAdvanced] = React.useState(Boolean(props.command?.keep_alive));

  const InfoServer = "AI Server / Provider";
  const InfoModel = "Model";
  const InfoCreativity = `Creativity Level:
- None: 0
- Low: 0.2
- Medium: 0.8 (Default)
- High: 1.5
- Maximum: 2`;
  const InfoThinking = "Thinking Effort";
  const InfoPrompt = `Prompt Template.
The following placeholders are supported:
- {selection}: Add selected text or clipboard to the prompt.
- {browser-tab}: Add current browser tab text to the prompt (Raycast Browser Extension required).
- {image}: Add image on clipboard or Finder (vision model required).`;

  async function Submit(values: FormData): Promise<void> {
    const isCustom = isCustomServer(values.server);
    const id = props.command?.id || getUniqueSlug(values.title, existingCommands || []);
    const commandToSave: CustomCommand = {
      id,
      title: values.title.trim(),
      server: values.server,
      model: values.model,
      prompt: values.prompt,
      creativity: values.creativity ? Number(values.creativity) : Creativity.Medium,
      thinking: values.thinking,
      action: (values.action as "view" | "replace") || "view",
      keep_alive: !isCustom && CheckboxAdvanced ? values.keep_alive : undefined,
      createdAt: props.command?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await SaveCustomCommand(commandToSave);
    await showToast({
      style: Toast.Style.Success,
      title: props.command ? "Command Updated" : "Command Created",
      message: `"${commandToSave.title}" saved successfully`,
    });

    props.revalidate?.();
    props.onSaved?.(commandToSave);

    if (props.command) {
      pop();
    } else {
      setCreatedCommand(commandToSave);
    }
  }

  if (createdCommand) {
    return (
      <Detail
        markdown={`# "${createdCommand.title}" Created!

Your custom AI command has been saved with Quicklink ID:
\`${createdCommand.id}\`

### Details:
- **Server:** ${createdCommand.server}
- **Model:** ${createdCommand.model}
- **Action:** ${createdCommand.action === "replace" ? "Replace Selection" : "Show View"}
- **Quicklink Target:** \`cmd-answer?arguments={"id":"${createdCommand.id}"}\`

---
Press **Enter** below to tag this command with a Raycast Quicklink, or manage it in **Manage AI Commands**.`}
        actions={
          <ActionPanel>
            <Action.CreateQuicklink
              title="Create Quicklink"
              icon={Icon.Link}
              quicklink={{
                name: createdCommand.title,
                link: getCustomCommandQuicklink(createdCommand.id),
              }}
            />
            <Action.CopyToClipboard
              title="Copy Quicklink URL"
              icon={Icon.CopyClipboard}
              content={getCustomCommandQuicklink(createdCommand.id)}
            />
            <Action
              title="Done"
              icon={Icon.Check}
              onAction={() => {
                pop();
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const ActionView = (
    <ActionPanel>
      <Action.SubmitForm
        title={props.command ? "Save Changes" : "Create Custom Command"}
        icon={Icon.Check}
        onSubmit={handleSubmit}
      />
      {props.command && (
        <Action.CreateQuicklink
          title="Create Quicklink"
          icon={Icon.Link}
          quicklink={{
            name: itemProps.title.value || props.command.title,
            link: getCustomCommandQuicklink(props.command.id),
          }}
        />
      )}
      {props.command && (
        <Action.CopyToClipboard title="Copy Quicklink URL" content={getCustomCommandQuicklink(props.command.id)} />
      )}
      <Action title="Cancel" icon={Icon.Xmark} onAction={() => pop()} />
    </ActionPanel>
  );

  const slugPreview = itemProps.title.value ? slugify(itemProps.title.value) : "";

  return (
    <Form isLoading={IsLoadingModel} actions={ActionView}>
      <Form.TextField
        title="Command Name"
        placeholder="e.g. Summarize Meeting Notes"
        info={slugPreview ? `Quicklink ID: ${slugPreview}` : "A unique Quicklink ID will be generated from this title"}
        {...itemProps.title}
      />

      {!IsLoadingModel && Model && (
        <Form.Dropdown
          title="Server"
          info={InfoServer}
          {...itemProps.server}
          onChange={(val) => {
            itemProps.server.onChange?.(val);
            const models = Model.get(val);
            if (models && models.length > 0) {
              setValue("model", models[0].name);
            }
          }}
        >
          {[...Model.keys()].sort().map((s) => (
            <Form.Dropdown.Item title={s} value={s} key={s} />
          ))}
        </Form.Dropdown>
      )}

      {!IsLoadingModel && Model && itemProps.server.value && (
        <Form.Dropdown title="Model" info={InfoModel} {...itemProps.model}>
          {Model.get(itemProps.server.value)?.map((s) => (
            <Form.Dropdown.Item title={s.name} value={s.name} key={s.name} />
          ))}
        </Form.Dropdown>
      )}

      <Form.Dropdown
        title="Action"
        info="Choose what action should be performed when launching this command."
        {...itemProps.action}
      >
        <Form.Dropdown.Item title="Show View" value="view" icon={Icon.Eye} />
        <Form.Dropdown.Item title="Replace Selection" value="replace" icon={Icon.Pencil} />
      </Form.Dropdown>

      <Form.Dropdown title="Creativity" info={InfoCreativity} {...itemProps.creativity}>
        <Form.Dropdown.Item title="None" value={String(Creativity.None)} key={Creativity.None} />
        <Form.Dropdown.Item title="Low" icon={Icon.StackedBars1} value={String(Creativity.Low)} key={Creativity.Low} />
        <Form.Dropdown.Item
          title="Medium"
          icon={Icon.StackedBars2}
          value={String(Creativity.Medium)}
          key={Creativity.Medium}
        />
        <Form.Dropdown.Item
          title="High"
          icon={Icon.StackedBars3}
          value={String(Creativity.High)}
          key={Creativity.High}
        />
        <Form.Dropdown.Item
          title="Maximum"
          icon={Icon.StackedBars4}
          value={String(Creativity.Maximum)}
          key={Creativity.Maximum}
        />
      </Form.Dropdown>

      <Form.Dropdown title="Thinking Effort" info={InfoThinking} {...itemProps.thinking}>
        <Form.Dropdown.Item title="None" value={String(ThinkingEffort.None)} key={String(ThinkingEffort.None)} />
        {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
          <Form.Dropdown.Item
            title="Low"
            icon={Icon.StackedBars1}
            value={String(ThinkingEffort.Low)}
            key={String(ThinkingEffort.Low)}
          />
        )}
        {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
          <Form.Dropdown.Item
            title="Medium"
            icon={Icon.StackedBars2}
            value={String(ThinkingEffort.Medium)}
            key={String(ThinkingEffort.Medium)}
          />
        )}
        {isThinkingModel(Model, itemProps.server.value, itemProps.model.value) && (
          <Form.Dropdown.Item
            title="High"
            icon={Icon.StackedBars3}
            value={String(ThinkingEffort.High)}
            key={String(ThinkingEffort.High)}
          />
        )}
      </Form.Dropdown>

      <Form.TextArea title="Prompt" placeholder="Enter your prompt template" info={InfoPrompt} {...itemProps.prompt} />

      {!isCustomServer(itemProps.server.value) && (
        <Form.Checkbox
          id="advanced"
          label="Advanced Settings"
          defaultValue={CheckboxAdvanced}
          onChange={SetCheckboxAdvanced}
        />
      )}
      {!isCustomServer(itemProps.server.value) && CheckboxAdvanced && (
        <Form.TextField title="Keep Alive" info={InfoKeepAlive} {...itemProps.keep_alive} />
      )}
    </Form>
  );
}
