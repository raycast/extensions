import { canAccessBrowserExtension } from "./utils/browser";
import { Action, ActionPanel, Form, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_MODEL, useModel } from "./hooks/useModel";
import { showFailureToast } from "@raycast/utils";
import { Conversation, Model } from "./type";
import Ask from "./ask";
import { open } from "@raycast/api";
import { PrimaryAction } from "./actions";
import { useBrowserContent } from "./hooks/useBrowser";
import { CacheAdapter } from "./utils/cache";
import { AuthProvider, resolveAuthStatus } from "./utils/auth";
import { filterModelsForAuth, orderModelsForSelection } from "./utils/model-support";
import { AuthGate } from "./views/auth-required";

export default function Summarize() {
  return (
    <AuthGate>
      <SummarizeView />
    </AuthGate>
  );
}

function SummarizeView() {
  if (!canAccessBrowserExtension()) {
    return (
      <List
        actions={
          <ActionPanel>
            <PrimaryAction title="Install" onAction={() => open("https://www.raycast.com/browser-extension")} />
          </ActionPanel>
        }
      >
        <List.EmptyView
          icon={Icon.BoltDisabled}
          title={"Browser Extension Required"}
          description={"This command need install Raycast browser extension to work. Please install it first"}
        />
      </List>
    );
  }

  const { loading, content, error: browserError, retry } = useBrowserContent();
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading) {
      return;
    }
    if (browserError) {
      showFailureToast(browserError, { title: "Retrieve content failed" });
      return;
    }
    setQuestion(content || "");
  }, [loading, content, browserError]);

  const { data, isLoading: modelLoading, option } = useModel();
  const [authProvider, setAuthProvider] = useState<AuthProvider>("none");

  useEffect(() => {
    resolveAuthStatus().then((auth) => {
      setAuthProvider(auth.provider);
    });
  }, []);

  const availableModels = useMemo(() => {
    return orderModelsForSelection(filterModelsForAuth(Object.values(data), authProvider, option));
  }, [data, authProvider, option]);

  const defaultModel = useMemo<Model>(() => {
    return availableModels.find((model) => model.id === "default") ?? availableModels[0] ?? DEFAULT_MODEL;
  }, [availableModels]);

  const separateDefaultModel = useMemo(() => {
    return availableModels.filter((model) => model.id !== defaultModel.id);
  }, [availableModels, defaultModel.id]);

  const modelsById = useMemo(() => {
    return availableModels.reduce<Record<string, Model>>((acc, model) => {
      acc[model.id] = model;
      return acc;
    }, {});
  }, [availableModels]);

  const [selectedModelId, setSelectedModelId] = useState<string>("default");
  const cache = new CacheAdapter("select_model");

  useEffect(() => {
    const selectModel = cache.get();
    setSelectedModelId(selectModel || "default");
  }, []);

  useEffect(() => {
    cache.set(selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    if (modelLoading || availableModels.length === 0) {
      return;
    }

    if (!modelsById[selectedModelId]) {
      setSelectedModelId(defaultModel.id);
    }
  }, [modelLoading, availableModels, modelsById, selectedModelId, defaultModel.id]);

  const RetryAction = () => {
    // - retry for browser retrieve failed
    // - go back reuse the component
    return <Action title="Retry" icon={Icon.Repeat} onAction={retry} />;
  };

  const { push } = useNavigation();

  return (
    <Form
      isLoading={loading || modelLoading}
      actions={
        <ActionPanel>
          {!content && <RetryAction />}
          <Action
            title="Submit"
            icon={Icon.Checkmark}
            onAction={() => {
              const chooseModel = modelsById[selectedModelId] ?? defaultModel;
              // PS: Ask page back to Summarize is purely new conversation
              // we don't want to maintain the old conversation
              const conversation: Conversation = {
                id: uuidv4(),
                chats: [],
                model: chooseModel,
                codexThreadId: null,
                pinned: false,
                updated_at: "",
                created_at: new Date().toISOString(),
              };
              push(<Ask conversation={conversation} initialQuestion={question} />);
            }}
          />
          {content && <RetryAction />}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Hydrate the website and prompt..."
        onChange={setQuestion}
        error={error || undefined}
        value={question}
        onFocus={() => {
          setError("");
        }}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError("Required");
          } else {
            setError("");
          }
        }}
      />
      {
        // the value not match any values warning so annoying
        (defaultModel || separateDefaultModel) && (
          <Form.Dropdown
            id="model"
            title="Model"
            placeholder="Choose model"
            value={selectedModelId}
            onChange={setSelectedModelId}
          >
            {defaultModel && (
              <Form.Dropdown.Item key={defaultModel.id} title={defaultModel.name} value={defaultModel.id} />
            )}
            <Form.Dropdown.Section title="Custom Models">
              {separateDefaultModel.map((model) => (
                <Form.Dropdown.Item value={model.id} title={model.name} key={model.id} />
              ))}
            </Form.Dropdown.Section>
          </Form.Dropdown>
        )
      }
    </Form>
  );
}
