import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Abilities, Model, Provider, RemoteModel } from "./types";
import { queryRemoteModels } from "./api";
import { ABILITY_TEMPLATES, DEFAULT_CONTEXT } from "./constants";

interface RemoteModelListProps {
  provider: Provider;
  apiKeyName?: string;
  onAdd: (models: Model[]) => boolean | Promise<boolean>;
}

interface RemoteModelImportFormProps {
  apiKeyNames: string[];
  defaultApiKeyName?: string;
  selectedModels: RemoteModel[];
  onImport: (models: Model[]) => boolean | Promise<boolean>;
}

export default function RemoteModelList({
  provider,
  apiKeyName,
  onAdd,
}: RemoteModelListProps) {
  const [models, setModels] = useState<RemoteModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [existingIds, setExistingIds] = useState(
    new Set(provider.models.map((m) => m.id)),
  );

  const modelIds = provider.models
    .map((m) => m.id)
    .sort()
    .join(",");

  useEffect(() => {
    setExistingIds(new Set(provider.models.map((m) => m.id)));
  }, [modelIds]);

  useEffect(() => {
    (async () => {
      try {
        const result = await queryRemoteModels(provider, apiKeyName);
        setModels(result.data || []);
        setQueryError(undefined);
      } catch (e) {
        setQueryError(String(e));
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to query models",
          message: String(e),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, [provider, apiKeyName]);

  function toggleSelect(modelId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) {
        next.delete(modelId);
      } else {
        next.add(modelId);
      }
      return next;
    });
  }

  function selectAllUnadded() {
    setSelected(new Set(unconfiguredModels.map((model) => model.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function handleImport(importedModels: Model[]) {
    const saved = await onAdd(importedModels);
    if (!saved) return false;

    setExistingIds(
      new Set([...existingIds, ...importedModels.map((m) => m.id)]),
    );
    setSelected(new Set());
    return true;
  }

  const selectedModels = models.filter((m) => selected.has(m.id));
  const apiKeyNames = provider.api_keys ? Object.keys(provider.api_keys) : [];
  const remoteIds = new Set(models.map((model) => model.id));
  const unconfiguredModels = models.filter(
    (model) => !existingIds.has(model.id),
  );
  const configuredRemoteModels = models.filter((model) =>
    existingIds.has(model.id),
  );
  const missingRemoteModels =
    !isLoading && !queryError
      ? provider.models.filter((model) => !remoteIds.has(model.id))
      : [];
  const syncSummary = `${models.length} remote, ${configuredRemoteModels.length} configured, ${unconfiguredModels.length} new, ${missingRemoteModels.length} missing`;

  function remoteModelActions(model?: RemoteModel) {
    const isSelected = model ? selected.has(model.id) : false;
    const alreadyAdded = model ? existingIds.has(model.id) : false;

    return (
      <ActionPanel>
        {model && !alreadyAdded && (
          <Action
            title={isSelected ? "Deselect Model" : "Select Model"}
            icon={isSelected ? Icon.Circle : Icon.CircleFilled}
            onAction={() => toggleSelect(model.id)}
          />
        )}
        {selected.size > 0 && (
          <Action.Push
            title={`Import ${selected.size} Selected Model(s)`}
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            target={
              <RemoteModelImportForm
                apiKeyNames={apiKeyNames}
                defaultApiKeyName={apiKeyName}
                selectedModels={selectedModels}
                onImport={handleImport}
              />
            }
          />
        )}
        {unconfiguredModels.length > 0 && (
          <Action
            title={`Select All ${unconfiguredModels.length} Unadded Model(s)`}
            icon={Icon.CheckCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={selectAllUnadded}
          />
        )}
        {selected.size > 0 && (
          <Action
            title="Deselect All"
            icon={Icon.Circle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={deselectAll}
          />
        )}
      </ActionPanel>
    );
  }

  return (
    <List
      navigationTitle={
        apiKeyName
          ? `Remote Models — ${provider.name} (${apiKeyName})`
          : `Remote Models — ${provider.name}`
      }
      isLoading={isLoading}
      searchBarPlaceholder="Search remote models..."
    >
      {queryError && (
        <List.EmptyView
          title="Failed to Query Remote Models"
          description={queryError}
        />
      )}
      {!queryError && (
        <List.Section title="Sync Summary" subtitle={syncSummary}>
          <List.Item
            icon={Icon.BarChart}
            title="Remote Model Sync"
            subtitle={apiKeyName ? `API key: ${apiKeyName}` : provider.base_url}
            accessories={[
              {
                tag: { value: `${selected.size} selected`, color: Color.Blue },
              },
            ]}
            actions={remoteModelActions()}
          />
        </List.Section>
      )}
      {!queryError && unconfiguredModels.length > 0 && (
        <List.Section
          title="Remote Models Not Configured"
          subtitle={`${unconfiguredModels.length}`}
        >
          {unconfiguredModels.map((model) => {
            const isSelected = selected.has(model.id);

            return (
              <List.Item
                key={model.id}
                icon={isSelected ? Icon.CircleFilled : Icon.Circle}
                title={model.id}
                subtitle={model.owned_by || ""}
                accessories={[
                  isSelected
                    ? { tag: { value: "Selected", color: Color.Blue } }
                    : { tag: { value: "New", color: Color.Green } },
                ]}
                actions={remoteModelActions(model)}
              />
            );
          })}
        </List.Section>
      )}
      {!queryError && configuredRemoteModels.length > 0 && (
        <List.Section
          title="Remote Models Already Configured"
          subtitle={`${configuredRemoteModels.length}`}
        >
          {configuredRemoteModels.map((model) => (
            <List.Item
              key={`configured-${model.id}`}
              icon={Icon.CheckCircle}
              title={model.id}
              subtitle={model.owned_by || ""}
              accessories={[{ tag: { value: "Configured", color: "#999" } }]}
              actions={remoteModelActions(model)}
            />
          ))}
        </List.Section>
      )}
      {!queryError && missingRemoteModels.length > 0 && (
        <List.Section
          title="Local Models Missing Remotely"
          subtitle={`${missingRemoteModels.length}`}
        >
          {missingRemoteModels.map((model) => (
            <List.Item
              key={`missing-${model.id}`}
              icon={Icon.ExclamationMark}
              title={model.name}
              subtitle={model.id}
              accessories={[{ tag: { value: "Missing", color: Color.Orange } }]}
              actions={remoteModelActions()}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function RemoteModelImportForm({
  apiKeyNames,
  defaultApiKeyName,
  selectedModels,
  onImport,
}: RemoteModelImportFormProps) {
  const { pop } = useNavigation();
  const [context, setContext] = useState(String(DEFAULT_CONTEXT));
  const [contextError, setContextError] = useState<string | undefined>();
  const [template, setTemplate] = useState("basic");
  const [modelProvider, setModelProvider] = useState(defaultApiKeyName || "");

  async function handleSubmit() {
    const contextNumber = Number(context);
    if (!Number.isInteger(contextNumber) || contextNumber <= 0) {
      setContextError("Must be a positive integer");
      return;
    }

    const abilities = ABILITY_TEMPLATES[template]?.abilities;
    const importedModels: Model[] = selectedModels.map((model) => ({
      id: model.id,
      name: model.id,
      context: contextNumber,
      ...(modelProvider ? { provider: modelProvider } : {}),
      ...(abilities ? { abilities: cloneAbilities(abilities) } : {}),
    }));

    const saved = await onImport(importedModels);
    if (!saved) return;

    pop();
  }

  return (
    <Form
      navigationTitle="Import Remote Models"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Models" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Selected Models"
        text={selectedModels.map((model) => model.id).join("\n")}
      />
      <Form.TextField
        id="context"
        title="Context Window"
        value={context}
        placeholder="e.g. 128000"
        error={contextError}
        onChange={(value) => {
          setContext(value);
          setContextError(undefined);
        }}
      />
      <Form.Dropdown
        id="template"
        title="Ability Template"
        value={template}
        onChange={setTemplate}
      >
        {Object.entries(ABILITY_TEMPLATES).map(([key, value]) => (
          <Form.Dropdown.Item key={key} value={key} title={value.label} />
        ))}
      </Form.Dropdown>
      {apiKeyNames.length > 0 && (
        <Form.Dropdown
          id="provider"
          title="API Key Mapping"
          value={modelProvider}
          onChange={setModelProvider}
        >
          <Form.Dropdown.Item value="" title="(None)" />
          {apiKeyNames.map((name) => (
            <Form.Dropdown.Item key={name} value={name} title={name} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

function cloneAbilities(abilities: Abilities): Abilities {
  return {
    temperature: abilities.temperature
      ? { supported: abilities.temperature.supported }
      : undefined,
    vision: abilities.vision
      ? { supported: abilities.vision.supported }
      : undefined,
    system_message: abilities.system_message
      ? { supported: abilities.system_message.supported }
      : undefined,
    tools: abilities.tools
      ? { supported: abilities.tools.supported }
      : undefined,
    reasoning_effort: abilities.reasoning_effort
      ? { supported: abilities.reasoning_effort.supported }
      : undefined,
  };
}
