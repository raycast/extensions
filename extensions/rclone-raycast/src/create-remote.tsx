import { ActionPanel, Action, Form, Icon, showToast, Toast, popToRoot } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import rclone from "./lib/rclone";
import {
  BackendOption,
  RemoteConfigState,
  buildInfo,
  dedupeBackendOptions,
  isProviderOption,
  toBoolean,
  toStringValue,
} from "./lib/remoteOptions";

export default function Command() {
  return <CreateRemoteForm />;
}

function CreateRemoteForm() {
  const [config, setConfig] = useState<RemoteConfigState>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [typeError, setTypeError] = useState<string | undefined>();

  const {
    data: providersResponse,
    isLoading: isLoadingProviders,
    error: providersError,
  } = useCachedPromise(async () => await rclone("/config/providers"), [], {
    keepPreviousData: true,
  });

  const providers = providersResponse?.providers ?? [];
  const sortedProviders = useMemo(() => [...providers].sort((a, b) => a.Name.localeCompare(b.Name)), [providers]);

  const currentBackend = useMemo(() => {
    if (!config.type) {
      return undefined;
    }
    return sortedProviders.find((provider) => provider.Name === config.type);
  }, [config.type, sortedProviders]);

  const currentBackendFields = useMemo(() => {
    const rawOptions = currentBackend?.Options as BackendOption[] | undefined;
    return dedupeBackendOptions(rawOptions, config);
  }, [currentBackend, config]);

  const basicFields = currentBackendFields.filter((option) => !option.Advanced);
  const advancedFields = currentBackendFields.filter((option) => option.Advanced);

  const handleReset = () => {
    setConfig({});
    setShowAdvanced(false);
    setNameError(undefined);
    setTypeError(undefined);
  };

  const handleTypeChange = (newType: string) => {
    setTypeError(undefined);
    setConfig((prev) => ({
      name: prev.name,
      type: newType || undefined,
    }));
  };

  const handleSubmit = async () => {
    const name = typeof config.name === "string" ? config.name.trim() : "";
    const type = typeof config.type === "string" ? config.type : "";

    if (!name) {
      setNameError("Remote name is required");
      await showToast({ style: Toast.Style.Failure, title: "Missing name" });
      return;
    }

    if (!type) {
      setTypeError("Remote type is required");
      await showToast({ style: Toast.Style.Failure, title: "Missing remote type" });
      return;
    }

    const rest = config;
    rest["name"] = undefined;
    rest["type"] = undefined;
    const parameters = Object.fromEntries(
      Object.entries(rest).filter(([key, value]) => {
        if (!key) {
          return false;
        }
        if (value === undefined) {
          return false;
        }
        if (typeof value === "string") {
          return value.length > 0;
        }
        return true;
      }),
    );

    setIsSubmitting(true);
    try {
      await rclone("/config/create", {
        params: {
          query: {
            name,
            type,
            parameters: JSON.stringify(parameters),
          },
        },
      });

      await showToast({ style: Toast.Style.Success, title: `${name} created` });
      handleReset();
      await popToRoot();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create remote",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderOptionField = (option: BackendOption) => {
    if (!option?.Name) {
      return null;
    }

    const fieldKey = option.FieldName || option.Name;
    const fieldId = `option-${fieldKey}`;
    const helpLines = option.Help?.split("\n") ?? [];
    const placeholder = helpLines[0] ?? "";
    const description = helpLines.slice(1).join("\n");
    const storedValue = config[option.Name];

    if (option.Type === "bool") {
      const checkboxValue = toBoolean(storedValue, option.Value ?? option.Default ?? option.DefaultStr);
      return (
        <Form.Checkbox
          key={fieldId}
          id={fieldId}
          label={option.Name}
          value={checkboxValue}
          onChange={(next) => setConfig((prev) => ({ ...prev, [option.Name]: next }))}
          info={description || undefined}
        />
      );
    }

    const value = toStringValue(storedValue ?? option.ValueStr ?? option.DefaultStr);

    if (isProviderOption(option) && option.Examples && option.Examples.length > 0) {
      const providerValue = typeof storedValue === "string" && storedValue.length > 0 ? storedValue : value;
      return (
        <Form.Dropdown
          key={fieldId}
          id={fieldId}
          title={option.Name}
          value={providerValue}
          onChange={(next) =>
            setConfig((prev) => ({
              ...prev,
              [option.Name]: next || undefined,
            }))
          }
          info={buildInfo(option, description)}
        >
          <Form.Dropdown.Item value="" title="Select a provider" />
          {option.Examples.map((example, index) => {
            const dropdownValue = example.Value ?? "";
            const itemKey = dropdownValue && dropdownValue.length > 0 ? dropdownValue : `provider-example-${index}`;
            return (
              <Form.Dropdown.Item
                key={itemKey}
                value={dropdownValue}
                title={
                  example.Help && example.Help.length > 0
                    ? `${example.Value || "Custom"} — ${example.Help}`
                    : example.Value || "Custom"
                }
              />
            );
          })}
        </Form.Dropdown>
      );
    }

    if (option.IsPassword) {
      return (
        <Form.PasswordField
          key={fieldId}
          id={fieldId}
          title={option.Name}
          placeholder={placeholder}
          value={value}
          onChange={(next) => setConfig((prev) => ({ ...prev, [option.Name]: next }))}
          info={description || undefined}
        />
      );
    }

    return (
      <Form.TextField
        key={fieldId}
        id={fieldId}
        title={option.Name}
        placeholder={placeholder}
        value={value}
        onChange={(next) => setConfig((prev) => ({ ...prev, [option.Name]: next }))}
        info={buildInfo(option, description)}
      />
    );
  };

  return (
    <Form
      isLoading={isLoadingProviders}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isSubmitting ? "Creating…" : "Create Remote"}
            icon={Icon.PlusCircle}
            onSubmit={handleSubmit}
          />
          <Action
            title={showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
            icon={showAdvanced ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setShowAdvanced((prev) => !prev)}
          />
          <Action
            title="Reset Form"
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleReset}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="My Remote"
        value={typeof config.name === "string" ? config.name : ""}
        onChange={(value) => {
          setNameError(undefined);
          setConfig((prev) => ({ ...prev, name: value }));
        }}
        error={nameError}
      />

      <Form.Dropdown
        id="type"
        title="Type"
        value={typeof config.type === "string" ? config.type : ""}
        onChange={handleTypeChange}
        error={typeError}
        isLoading={isLoadingProviders}
      >
        <Form.Dropdown.Item value="" title="Select a backend" />
        <Form.Dropdown.Section title="Available Backends">
          {sortedProviders.map((backend) => (
            <Form.Dropdown.Item
              key={backend.Name}
              value={backend.Name}
              title={backend.Description?.replace(" (this is not Google Drive)", "") || backend.Name}
            />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>

      {providersError ? <Form.Description text={`Failed to load providers: ${providersError.message}`} /> : null}

      {currentBackend ? (
        <Form.Description title="Backend" text={currentBackend.Description ?? currentBackend.Name} />
      ) : (
        <Form.Description text="Select a backend to configure its options." />
      )}

      {basicFields.map((option) => renderOptionField(option as BackendOption))}

      {advancedFields.length > 0 && (
        <>
          <Form.Separator />
          <Form.Checkbox
            id="showAdvancedToggle"
            label="Show Advanced Options"
            value={showAdvanced}
            onChange={setShowAdvanced}
          />
          {showAdvanced ? advancedFields.map((option) => renderOptionField(option as BackendOption)) : null}
        </>
      )}
    </Form>
  );
}
