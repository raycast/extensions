import { ActionPanel, Action, Form, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import rclone from "../lib/rclone";
import {
  BackendOption,
  FlagValue,
  RemoteConfigState,
  buildInfo,
  dedupeBackendOptions,
  isProviderOption,
  toBoolean,
  toStringValue,
} from "../lib/remoteOptions";
import useRemoteConfig from "../hooks/useRemoteConfig";

export default function EditRemoteForm({ remote }: { remote: string }) {
  const { data: remoteConfig, isLoading: isRemoteLoading } = useRemoteConfig(remote);
  const [config, setConfig] = useState<RemoteConfigState>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (remoteConfig) {
      setConfig(remoteConfig as RemoteConfigState);
    }
  }, [remoteConfig]);

  const {
    data: providersResponse,
    isLoading: isLoadingProviders,
    error: providersError,
  } = useCachedPromise(async () => await rclone("/config/providers"), [], {
    keepPreviousData: true,
  });

  const providers = providersResponse?.providers ?? [];
  const sortedProviders = useMemo(() => [...providers].sort((a, b) => a.Name.localeCompare(b.Name)), [providers]);

  const currentType = (remoteConfig?.type ?? config.type) as string | undefined;
  const currentBackend = useMemo(() => {
    if (!currentType) {
      return undefined;
    }
    return sortedProviders.find((provider) => provider.Name === currentType);
  }, [sortedProviders, currentType]);

  const currentBackendFields = useMemo(() => {
    const rawOptions = currentBackend?.Options as BackendOption[] | undefined;
    return dedupeBackendOptions(rawOptions, config);
  }, [currentBackend, config]);

  const basicFields = currentBackendFields.filter((option) => !option.Advanced);
  const advancedFields = currentBackendFields.filter((option) => option.Advanced);

  const isLoading = isRemoteLoading || isLoadingProviders;

  const handleFieldChange = (key: string, value: FlagValue) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    if (remoteConfig) {
      setConfig(remoteConfig as RemoteConfigState);
    }
    setShowAdvanced(false);
  };

  const handleSubmit = async () => {
    if (!remoteConfig) {
      await showToast({ style: Toast.Style.Failure, title: "Remote config not loaded" });
      return;
    }

    const updates = Object.fromEntries(
      Object.entries(config).filter(([key, value]) => {
        if (key === "type" || key === "name") {
          return false;
        }
        return remoteConfig[key] !== value;
      }),
    );

    if (Object.keys(updates).length === 0) {
      await showToast({ style: Toast.Style.Animated, title: "No changes to save" });
      return;
    }

    setIsSaving(true);
    try {
      await rclone("/config/update", {
        params: {
          query: {
            name: remote,
            parameters: JSON.stringify(updates),
          },
        },
      });
      await showToast({ style: Toast.Style.Success, title: `${remote} updated` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update remote",
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderOptionField = (option: BackendOption) => {
    if (!option?.Name) {
      return null;
    }

    const fieldKey = option.FieldName || option.Name;
    const fieldId = `edit-option-${fieldKey}`;
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
          onChange={(next) => handleFieldChange(option.Name, next)}
          info={description || undefined}
        />
      );
    }

    const value = toStringValue(storedValue ?? option.ValueStr ?? option.DefaultStr);

    if (isProviderOption(option) && option.Examples && option.Examples.length > 0) {
      return (
        <Form.Dropdown
          key={fieldId}
          id={fieldId}
          title={option.Name}
          value={value}
          onChange={(next) => handleFieldChange(option.Name, next || undefined)}
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
          onChange={(next) => handleFieldChange(option.Name, next)}
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
        onChange={(next) => handleFieldChange(option.Name, next)}
        info={buildInfo(option, description)}
      />
    );
  };

  return (
    <Form
      navigationTitle={`Edit ${remote}`}
      isLoading={isLoading}
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={isSaving ? "Saving…" : "Save Changes"}
            icon={Icon.Checkmark}
            onSubmit={handleSubmit}
          />
          <Action
            title={showAdvanced ? "Hide Advanced Options" : "Show Advanced Options"}
            icon={showAdvanced ? Icon.EyeDisabled : Icon.Eye}
            onAction={() => setShowAdvanced((prev) => !prev)}
          />
          <Action
            title="Reset Changes"
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={handleReset}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Remote" text={remote} />
      <Form.Description title="Type" text={currentType ?? "Unknown"} />

      {providersError ? <Form.Description text={`Failed to load providers: ${providersError.message}`} /> : null}

      {basicFields.map((option) => renderOptionField(option))}

      {advancedFields.length > 0 && (
        <>
          <Form.Separator />
          <Form.Checkbox
            id="edit-show-advanced"
            label="Show Advanced Options"
            value={showAdvanced}
            onChange={setShowAdvanced}
          />
          {showAdvanced ? advancedFields.map((option) => renderOptionField(option)) : null}
        </>
      )}
    </Form>
  );
}
