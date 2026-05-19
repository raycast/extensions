import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { Fragment, useState } from "react";
import { Provider, AdditionalParameters } from "./types";

interface ProviderFormProps {
  provider?: Provider;
  existingIds?: string[];
  isDuplicate?: boolean;
  onSave: (provider: Provider) => boolean | Promise<boolean>;
}

interface ApiKeyRowError {
  keyName?: string;
  keyValue?: string;
}

export default function ProviderForm({
  provider,
  existingIds = [],
  isDuplicate = false,
  onSave,
}: ProviderFormProps) {
  const { pop } = useNavigation();
  const isEditing = !!provider && !isDuplicate;

  const [id, setId] = useState(provider?.id || "");
  const [name, setName] = useState(provider?.name || "");
  const [baseUrl, setBaseUrl] = useState(provider?.base_url || "");

  const initialKeys = provider?.api_keys
    ? Object.entries(provider.api_keys).map(([k, v], i) => ({
        idx: i,
        keyName: k,
        keyValue: v,
      }))
    : [{ idx: 0, keyName: "", keyValue: "" }];
  const [apiKeys, setApiKeys] = useState(initialKeys);
  const [nextIdx, setNextIdx] = useState(initialKeys.length);

  const [returnImages, setReturnImages] = useState(
    provider?.additional_parameters?.return_images ?? false,
  );
  const [searchContextSize, setSearchContextSize] = useState<string>(
    provider?.additional_parameters?.web_search_options?.search_context_size ||
      "medium",
  );

  const [idError, setIdError] = useState<string | undefined>();
  const [nameError, setNameError] = useState<string | undefined>();
  const [urlError, setUrlError] = useState<string | undefined>();
  const [apiKeyErrors, setApiKeyErrors] = useState<
    Record<number, ApiKeyRowError>
  >({});

  function validateId(value: string): string | undefined {
    if (!value.trim()) return "ID is required";
    if (!/^[a-zA-Z0-9-]+$/.test(value))
      return "Only alphanumeric and hyphens allowed";
    if (!isEditing && existingIds.includes(value)) return "ID already exists";
    return undefined;
  }

  function validateUrl(value: string): string | undefined {
    if (!value.trim()) return "Base URL is required";
    try {
      new URL(value);
      return undefined;
    } catch {
      return "Must be a valid URL";
    }
  }

  function addApiKeyRow() {
    setApiKeys([...apiKeys, { idx: nextIdx, keyName: "", keyValue: "" }]);
    setNextIdx(nextIdx + 1);
  }

  function removeApiKeyRow(idx: number) {
    setApiKeyErrors((current) => {
      const next = { ...current };
      delete next[idx];
      return next;
    });

    if (apiKeys.length === 1) {
      setApiKeys([{ ...apiKeys[0], keyName: "", keyValue: "" }]);
      return;
    }

    setApiKeys(apiKeys.filter((e) => e.idx !== idx));
  }

  function updateApiKeyRow(
    idx: number,
    field: "keyName" | "keyValue",
    value: string,
  ) {
    setApiKeys(
      apiKeys.map((e) => (e.idx === idx ? { ...e, [field]: value } : e)),
    );
    setApiKeyErrors((current) => {
      const next = { ...current };
      if (next[idx]) {
        next[idx] = { ...next[idx], [field]: undefined };
        if (!next[idx].keyName && !next[idx].keyValue) {
          delete next[idx];
        }
      }
      return next;
    });
  }

  function validateApiKeys(): Record<number, ApiKeyRowError> {
    const errors: Record<number, ApiKeyRowError> = {};
    const rowsByName = new Map<string, number[]>();

    for (const entry of apiKeys) {
      const keyName = entry.keyName.trim();
      const keyValue = entry.keyValue.trim();

      if (!keyName && !keyValue) continue;

      if (!keyName) {
        errors[entry.idx] = {
          ...errors[entry.idx],
          keyName: "Key name is required when value is set",
        };
      }
      if (!keyValue) {
        errors[entry.idx] = {
          ...errors[entry.idx],
          keyValue: "Key value is required when name is set",
        };
      }

      if (keyName) {
        const normalizedName = keyName.toLowerCase();
        rowsByName.set(normalizedName, [
          ...(rowsByName.get(normalizedName) || []),
          entry.idx,
        ]);
      }
    }

    for (const duplicateRows of rowsByName.values()) {
      if (duplicateRows.length <= 1) continue;

      for (const idx of duplicateRows) {
        errors[idx] = {
          ...errors[idx],
          keyName: "API key name must be unique",
        };
      }
    }

    return errors;
  }

  async function handleSubmit() {
    const idErr = isEditing ? undefined : validateId(id);
    const nameErr = name.trim() ? undefined : "Name is required";
    const urlErr = validateUrl(baseUrl);
    const apiKeyErrs = validateApiKeys();

    setIdError(idErr);
    setNameError(nameErr);
    setUrlError(urlErr);
    setApiKeyErrors(apiKeyErrs);

    if (idErr || nameErr || urlErr || Object.keys(apiKeyErrs).length > 0) {
      return;
    }

    const apiKeysRecord: Record<string, string> = {};
    for (const entry of apiKeys) {
      if (entry.keyName.trim() && entry.keyValue.trim()) {
        apiKeysRecord[entry.keyName.trim()] = entry.keyValue.trim();
      }
    }

    const additionalParams: AdditionalParameters = {};
    if (returnImages) additionalParams.return_images = true;
    if (
      searchContextSize !== "medium" ||
      provider?.additional_parameters?.web_search_options
    ) {
      additionalParams.web_search_options = {
        search_context_size: searchContextSize as "low" | "medium" | "high",
      };
    }

    const result: Provider = {
      id: isEditing ? provider!.id : id.trim(),
      name: name.trim(),
      base_url: baseUrl.trim(),
      models: provider?.models || [],
    };

    if (Object.keys(apiKeysRecord).length > 0) {
      result.api_keys = apiKeysRecord;
    }
    if (Object.keys(additionalParams).length > 0) {
      result.additional_parameters = additionalParams;
    }

    const saved = await onSave(result);
    if (!saved) return;

    showToast({
      style: Toast.Style.Success,
      title: isEditing ? "Provider Updated" : "Provider Added",
    });
    pop();
  }

  return (
    <Form
      navigationTitle={
        isEditing
          ? `Edit ${provider!.name}`
          : isDuplicate
            ? `Duplicate ${provider!.name}`
            : "Add Provider"
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              isEditing
                ? "Save Changes"
                : isDuplicate
                  ? "Create Provider"
                  : "Add Provider"
            }
            onSubmit={handleSubmit}
          />
          <Action
            title="Add Api Key"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "j" }}
            onAction={addApiKeyRow}
          />
          <ActionPanel.Section title="API Keys">
            {apiKeys.map((entry, index) => (
              <Action
                key={`remove-key-${entry.idx}`}
                title={
                  apiKeys.length === 1
                    ? "Clear Api Key Row 1"
                    : `Remove Api Key Row ${index + 1}`
                }
                icon={Icon.Minus}
                shortcut={
                  index === apiKeys.length - 1
                    ? { modifiers: ["cmd", "shift"], key: "j" }
                    : undefined
                }
                onAction={() => removeApiKeyRow(entry.idx)}
              />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {!isEditing && (
        <Form.TextField
          id="id"
          title="ID"
          placeholder="e.g. perplexity"
          value={id}
          onChange={(v) => {
            setId(v);
            setIdError(undefined);
          }}
          error={idError}
          onBlur={() => setIdError(validateId(id))}
        />
      )}
      <Form.TextField
        id="name"
        title="Name"
        placeholder="e.g. Perplexity"
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
      />
      <Form.TextField
        id="base_url"
        title="Base URL"
        placeholder="e.g. https://api.perplexity.ai"
        value={baseUrl}
        onChange={(v) => {
          setBaseUrl(v);
          setUrlError(undefined);
        }}
        error={urlError}
      />

      <Form.Separator />
      <Form.Description
        title="API Keys"
        text="Each key has a name (e.g. openai) and a value. Use Add/Remove Key actions in the action panel."
      />

      {apiKeys.map((entry) => (
        <Fragment key={`key-${entry.idx}`}>
          <Form.TextField
            id={`keyname-${entry.idx}`}
            title={`Key ${entry.idx + 1} Name`}
            placeholder="e.g. openai"
            value={entry.keyName}
            error={apiKeyErrors[entry.idx]?.keyName}
            onChange={(v) => updateApiKeyRow(entry.idx, "keyName", v)}
          />
          <Form.PasswordField
            id={`keyval-${entry.idx}`}
            title={`Key ${entry.idx + 1} Value`}
            placeholder="e.g. sk-xxx"
            value={entry.keyValue}
            error={apiKeyErrors[entry.idx]?.keyValue}
            onChange={(v) => updateApiKeyRow(entry.idx, "keyValue", v)}
          />
        </Fragment>
      ))}

      <Form.Separator />
      <Form.Description title="Additional Parameters" text="" />
      <Form.Checkbox
        id="return_images"
        label="Return Images"
        value={returnImages}
        onChange={setReturnImages}
      />
      <Form.Dropdown
        id="search_context_size"
        title="Search Context Size"
        value={searchContextSize}
        onChange={setSearchContextSize}
      >
        <Form.Dropdown.Item value="low" title="Low" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="high" title="High" />
      </Form.Dropdown>
    </Form>
  );
}
