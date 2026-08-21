import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { AI_SERVICES, type AIServiceId } from "./lib/prompt-urls.js";
import { upsertPreset } from "./lib/preset-storage.js";
import {
  DEFAULT_SERVICE_COUNTS,
  type PromptPreset,
  type PresetServiceCounts,
} from "./lib/presets.js";

type PresetFormValues = {
  name: string;
  template: string;
} & Record<AIServiceId, string>;

const TAB_OPTIONS = [0, 1, 2, 3, 4, 5];

interface PresetConfigFormProps {
  preset?: PromptPreset;
  onSave: (preset: PromptPreset) => void;
}

export function PresetConfigForm({ preset, onSave }: PresetConfigFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string>();
  const [templateError, setTemplateError] = useState<string>();
  const { pop } = useNavigation();

  async function handleSubmit(values: PresetFormValues) {
    const name = values.name?.trim() ?? "";
    const template = values.template ?? "";
    if (!name || !template.trim()) {
      setNameError(name ? undefined : "Enter a name");
      setTemplateError(template.trim() ? undefined : "Enter a prompt template");
      return false;
    }

    const serviceCounts = Object.fromEntries(
      AI_SERVICES.map((service) => [
        service.id,
        Number.parseInt(values[service.id] || "0", 10),
      ]),
    ) as PresetServiceCounts;
    if (Object.values(serviceCounts).every((count) => count === 0)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one service",
      });
      return;
    }

    const nextPreset: PromptPreset = {
      id: preset?.id ?? randomUUID(),
      name,
      template,
      serviceCounts,
    };
    setIsLoading(true);
    try {
      await upsertPreset(nextPreset);
      onSave(nextPreset);
      await showToast({
        style: Toast.Style.Success,
        title: `Saved ${name}`,
      });
      await pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not save preset",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  const counts = preset?.serviceCounts ?? DEFAULT_SERVICE_COUNTS;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={preset ? "Edit Preset" : "Create Preset"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Preset"
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Recent X Posts"
        defaultValue={preset?.name}
        error={nameError}
        onBlur={(event) =>
          setNameError(event.target.value?.trim() ? undefined : "Enter a name")
        }
        onChange={() => setNameError(undefined)}
        autoFocus
      />
      <Form.TextArea
        id="template"
        title="Prompt Template"
        placeholder="Use named arguments such as {topic} and {language}."
        defaultValue={preset?.template}
        error={templateError}
        onBlur={(event) =>
          setTemplateError(
            event.target.value?.trim() ? undefined : "Enter a prompt template",
          )
        }
        onChange={() => setTemplateError(undefined)}
      />
      <Form.Description
        title="Arguments"
        text="Every named placeholder, such as {topic}, becomes a field when you run this preset. Repeated placeholders reuse the same value."
      />
      <Form.Separator />
      {AI_SERVICES.map((service) => (
        <Form.Dropdown
          key={service.id}
          id={service.id}
          title={service.name}
          defaultValue={String(counts[service.id])}
        >
          {TAB_OPTIONS.map((count) => (
            <Form.Dropdown.Item
              key={count}
              title={
                count === 0 ? "Off" : `${count} tab${count === 1 ? "" : "s"}`
              }
              value={String(count)}
            />
          ))}
        </Form.Dropdown>
      ))}
    </Form>
  );
}
