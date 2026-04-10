import { Action, ActionPanel, Form, Icon, Toast, openExtensionPreferences, showToast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  clearHugeiconsApiKeyOverride,
  getPreferenceHugeiconsApiKey,
  getStoredHugeiconsApiKey,
  saveHugeiconsApiKeyOverride,
} from "./lib/hugeicons-auth";

type FormValues = {
  apiKey: string;
};

export default function Command() {
  const [apiKey, setApiKey] = useState("");
  const [hasStoredOverride, setHasStoredOverride] = useState(false);
  const [hasPreferenceKey, setHasPreferenceKey] = useState(false);

  const loadState = useCallback(async () => {
    const [storedApiKey, preferenceApiKey] = await Promise.all([
      getStoredHugeiconsApiKey(),
      Promise.resolve(getPreferenceHugeiconsApiKey()),
    ]);

    setHasStoredOverride(Boolean(storedApiKey));
    setHasPreferenceKey(Boolean(preferenceApiKey));
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function handleSubmit(values: FormValues) {
    try {
      await saveHugeiconsApiKeyOverride(values.apiKey);
      setApiKey("");
      await loadState();
      await showToast({
        style: Toast.Style.Success,
        title: hasStoredOverride ? "API key updated" : "API key saved",
        message: "The local key override will be used across Hugeicons UI commands.",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't save API key",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async function handleClear() {
    await clearHugeiconsApiKeyOverride();
    setApiKey("");
    await loadState();
    await showToast({
      style: Toast.Style.Success,
      title: "Saved API key removed",
      message: hasPreferenceKey ? "Hugeicons UI will fall back to the key in extension settings." : undefined,
    });
  }

  return (
    <Form
      navigationTitle="Add API Key"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={hasStoredOverride ? "Update Key" : "Save Key"}
            icon={Icon.Key}
            onSubmit={handleSubmit}
          />
          {hasStoredOverride && (
            <Action
              title="Remove Saved Key"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
              onAction={handleClear}
            />
          )}
          <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Key Source"
        text={
          hasStoredOverride
            ? "A saved API key override is currently active for Hugeicons UI."
            : hasPreferenceKey
              ? "No saved override. Hugeicons UI will currently use the API key from extension settings."
              : "No API key is configured yet. Free icons still work without one."
        }
      />
      <Form.PasswordField
        id="apiKey"
        title="Hugeicons API Key"
        placeholder="Paste your Universal License Token"
        value={apiKey}
        onChange={setApiKey}
      />
      <Form.Description
        title="Storage"
        text="This command saves a local override for Hugeicons UI commands. If you prefer managing the key in Raycast settings, use Open Extension Settings."
      />
    </Form>
  );
}
