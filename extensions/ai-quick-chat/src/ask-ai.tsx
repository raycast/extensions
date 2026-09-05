import {
  Action,
  ActionPanel,
  Form,
  Icon,
  LaunchProps,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConversationView } from "./chat-view";
import { ProviderForm } from "./provider-form";
import {
  getActiveSelection,
  getProviders,
  setActiveSelection,
} from "./provider-store";

interface AskArguments {
  prompt?: string;
}

function NewChatForm(props: { onSubmit: (prompt: string) => void }) {
  const {
    data: providerData,
    isLoading,
    revalidate,
  } = usePromise(getProviders);
  const [prompt, setPrompt] = useState("");
  const [selection, setSelection] = useState("");
  const promptRef = useRef<Form.TextArea>(null);

  const options = useMemo(
    () =>
      (providerData ?? []).flatMap((provider) =>
        Array.from(
          new Set(
            [provider.defaultModelId, ...provider.models].filter(Boolean),
          ),
        ).map((modelId) => ({
          key: `${provider.id}::${modelId}`,
          providerId: provider.id,
          modelId,
          title: `${provider.name} — ${modelId}`,
        })),
      ),
    [providerData],
  );
  const providers = providerData ?? [];

  useEffect(() => {
    setPrompt("");
    promptRef.current?.reset();
  }, []);

  useEffect(() => {
    void getActiveSelection().then((active) => {
      const key = active
        ? `${active.providerId}::${active.modelId}`
        : options[0]?.key;
      if (key && options.some((option) => option.key === key))
        setSelection(key);
      else if (options[0]) setSelection(options[0].key);
    });
  }, [options]);

  if (!isLoading && providers.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Stars}
          title="Add an AI Provider"
          description="Configure an OpenAI-compatible endpoint before starting a chat."
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Provider"
                icon={Icon.Plus}
                target={
                  <ProviderForm
                    onSaved={async () => void (await revalidate())}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const submit = async () => {
    const value = prompt.trim();
    const selected = options.find((option) => option.key === selection);
    if (!value) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a message" });
      return;
    }
    if (!selected) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a model" });
      return;
    }
    await setActiveSelection({
      providerId: selected.providerId,
      modelId: selected.modelId,
    });
    props.onSubmit(value);
  };

  return (
    <Form
      enableDrafts={false}
      isLoading={isLoading}
      navigationTitle="Ask AI"
      actions={
        <ActionPanel>
          <Action
            title="Send Message"
            icon={Icon.ArrowRight}
            onAction={() => void submit()}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        ref={promptRef}
        id="prompt"
        placeholder="Ask anything..."
        value={prompt}
        onChange={setPrompt}
        autoFocus
        storeValue={false}
      />
      <Form.Dropdown
        id="model"
        value={selection}
        onChange={(value) => {
          setSelection(value);
          const selected = options.find((option) => option.key === value);
          if (selected) {
            void setActiveSelection({
              providerId: selected.providerId,
              modelId: selected.modelId,
            });
          }
        }}
      >
        {options.map((option) => (
          <Form.Dropdown.Item
            key={option.key}
            value={option.key}
            title={option.title}
          />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

export default function AskAICommand(
  props: LaunchProps<{ arguments: AskArguments }>,
) {
  const launchPrompt = (
    props.fallbackText ||
    props.arguments.prompt ||
    ""
  ).trim();
  const [prompt, setPrompt] = useState(launchPrompt);
  return prompt ? (
    <ConversationView initialPrompt={prompt} />
  ) : (
    <NewChatForm onSubmit={setPrompt} />
  );
}
