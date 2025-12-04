import { Action, ActionPanel, Form, open } from "@raycast/api";
import { useState } from "react";

const models = [
  {
    id: "sonnet-3.5",
    title: "Claude Sonnet 3.5",
    supportsVariants: true,
    provider: "anthropic",
  },

  {
    id: "gpt-4o",
    title: "GPT-4o",
    supportsVariants: true,
    provider: "openai",
  },
  {
    id: "o1-preview",
    title: "o1-preview",
    supportsVariants: false,
    provider: "openai",
  },
  {
    id: "o1-mini",
    title: "o1-mini",
    supportsVariants: false,
    provider: "openai",
  },
];

const providers = [
  {
    id: "anthropic",
    title: "Anthropic",
  },
  {
    id: "openai",
    title: "OpenAI",
  },
];

export default function Command() {
  const [selectedModelId, setSelectedModelId] = useState<string>("sonnet-3.5");
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  async function handleSubmit(values: { description: string; model: string; generateVariants?: boolean }) {
    if (!values.description) {
      setDescriptionError("Please enter a description");
      return;
    }

    await open(
      `https://spark.githubnext.com/new/${encodeURIComponent(values.description)}?${new URLSearchParams({
        model: values.model,
        generateVariants: values.generateVariants ? "true" : "false",
      }).toString()}`,
    );
  }

  function dropDescriptionErrorIfNeeded() {
    if (descriptionError && descriptionError.length > 0) {
      setDescriptionError(undefined);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Go" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="description"
        title="Description"
        placeholder="What do you want to create"
        error={descriptionError}
        onChange={dropDescriptionErrorIfNeeded}
      />
      <Form.Dropdown id="model" title="Model" value={selectedModelId} onChange={setSelectedModelId}>
        {providers.map((provider) => (
          <Form.Dropdown.Section key={provider.id} title={provider.title}>
            {models
              .filter((model) => model.provider === provider.id)
              .map((model) => (
                <Form.Dropdown.Item key={model.id} value={model.id} title={model.title} />
              ))}
          </Form.Dropdown.Section>
        ))}
      </Form.Dropdown>
      {models.find((model) => model.id === selectedModelId)?.supportsVariants ? (
        <Form.Checkbox id="generateVariants" label="Generate variants" />
      ) : null}
    </Form>
  );
}
