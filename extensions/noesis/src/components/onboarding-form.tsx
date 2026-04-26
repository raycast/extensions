import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { normalizeBaseUrl, validateSelemeneCredentials } from "../lib/api";
import { openCommand } from "../lib/navigation";
import {
  clearDashboardCache,
  clearPersonalDataCache,
  syncDashboardSnapshot,
} from "../lib/queries";
import {
  clearStoredConfig,
  DEFAULT_BASE_URL,
  getApiKeyStorageMode,
  getStoredApiKey,
  getStoredBaseUrl,
  getSecurePreferenceApiKey,
  saveStoredConfig,
} from "../lib/settings";

interface OnboardingValues {
  baseUrl: string;
  apiKey: string;
}

interface OnboardingFormProps {
  onSaved?: () => Promise<void> | void;
}

export function OnboardingForm(props: OnboardingFormProps) {
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [existingApiKey, setExistingApiKey] = useState("");
  const [existingBaseUrl, setExistingBaseUrl] = useState(DEFAULT_BASE_URL);
  const [apiKeyStorageMode, setApiKeyStorageMode] = useState("none");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [savedBaseUrl, savedApiKey, storageMode] = await Promise.all([
        getStoredBaseUrl(),
        getStoredApiKey(),
        getApiKeyStorageMode(),
      ]);
      setBaseUrl(savedBaseUrl);
      setExistingBaseUrl(savedBaseUrl);
      setExistingApiKey(savedApiKey);
      setApiKeyStorageMode(storageMode);
      setIsLoading(false);
    };

    load();
  }, []);

  const handleSubmit = async (values: OnboardingValues) => {
    const securePreferenceApiKey = getSecurePreferenceApiKey();
    const resolvedApiKey = values.apiKey.trim() || existingApiKey;
    if (
      securePreferenceApiKey &&
      values.apiKey.trim() &&
      values.apiKey.trim() !== securePreferenceApiKey
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key is managed in preferences",
        message:
          "Open Extension Preferences to rotate the secure API key, then return here to validate it.",
      });
      return;
    }

    const resolvedBaseUrl = normalizeBaseUrl(
      values.baseUrl.trim() || DEFAULT_BASE_URL,
    );
    const isReplacingApiKey = Boolean(
      values.apiKey.trim() && values.apiKey.trim() !== existingApiKey,
    );
    const isChangingBaseUrl = resolvedBaseUrl !== existingBaseUrl;

    if (!resolvedApiKey) {
      await showToast({
        style: Toast.Style.Failure,
        title: "API key required",
        message: "Paste a Selemene Engine API key to complete onboarding.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await validateSelemeneCredentials({
        baseUrl: resolvedBaseUrl,
        apiKey: resolvedApiKey,
      });

      if (isReplacingApiKey || isChangingBaseUrl) {
        clearDashboardCache();
      }

      const storageMode = await saveStoredConfig({
        baseUrl: resolvedBaseUrl,
        apiKey: resolvedApiKey,
      });
      await syncDashboardSnapshot({
        force: true,
        configOverride: { baseUrl: resolvedBaseUrl, apiKey: resolvedApiKey },
      });

      await showToast({
        style: Toast.Style.Success,
        title: isReplacingApiKey
          ? "API key replaced"
          : "Selemene Engine connected",
        message:
          isReplacingApiKey || isChangingBaseUrl
            ? `${storageMode === "preference" ? "Secure preference key confirmed" : "Legacy key saved locally"}, old account cache cleared, and the new profile is warmed.`
            : `${storageMode === "preference" ? "Secure preference key confirmed" : "Local cache warmed and ready."}`,
      });

      setExistingApiKey(resolvedApiKey);
      setExistingBaseUrl(resolvedBaseUrl);
      setApiKeyStorageMode(storageMode);
      setApiKey("");

      if (props.onSaved) {
        await props.onSaved();
      } else {
        await openCommand("dashboard");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Onboarding failed",
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate the Selemene Engine API key.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    const confirmed = await confirmAlert({
      title: "Clear saved API key and cache?",
      message:
        apiKeyStorageMode === "preference"
          ? "This clears the cached base URL, legacy key fallback, and local data. If a secure preference key exists, remove it in Extension Preferences to fully disconnect."
          : "This removes the saved key plus cached profile, readings, and pulse data from this Mac.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Clear Key and Cache",
      },
    });

    if (!confirmed) {
      return;
    }

    const result = await clearStoredConfig();
    const remainingSecureApiKey = getSecurePreferenceApiKey();
    clearDashboardCache();
    setExistingApiKey(remainingSecureApiKey);
    setExistingBaseUrl(DEFAULT_BASE_URL);
    setApiKeyStorageMode(
      result.apiKeyStorageMode === "preference" ? "preference" : "none",
    );
    setApiKey("");

    await showToast({
      style: Toast.Style.Success,
      title:
        result.apiKeyStorageMode === "preference"
          ? "Local cache cleared"
          : "Saved key and cache cleared",
      message:
        result.apiKeyStorageMode === "preference"
          ? "Remove the secure API key in Extension Preferences to fully disconnect this extension."
          : undefined,
    });
  };

  const handleClearPersonalCache = async () => {
    const confirmed = await confirmAlert({
      title: "Clear personal cache data?",
      message:
        "This removes cached profile, usage, readings, and pulse board data but keeps the Selemene catalog and connection settings.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Clear Personal Cache",
      },
    });

    if (!confirmed) {
      return;
    }

    clearPersonalDataCache();
    await showToast({
      style: Toast.Style.Success,
      title: "Personal cache cleared",
    });
  };

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={
              existingApiKey
                ? "Validate and Replace Key"
                : "Validate and Save Key"
            }
            icon={Icon.CheckCircle}
            onSubmit={handleSubmit}
          />
          <Action
            title="Open Secure Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action
            title="Clear Personal Cache"
            icon={Icon.PersonCircle}
            onAction={handleClearPersonalCache}
          />
          {existingApiKey ? (
            <Action
              title="Clear Saved Key and Cache"
              icon={Icon.Trash}
              onAction={handleClear}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        title={existingApiKey ? "Edit API Key" : "Connect API Key"}
        text={
          apiKeyStorageMode === "preference"
            ? "The API key is currently managed in Raycast secure preferences. This command validates the current secure key, manages the base URL, and clears or refreshes local cache data."
            : "Connect Tryambakam Noesis to the Selemene Engine. Replacing the key clears the old local snapshot first, then warms the dashboard from the account attached to the new key."
        }
      />
      <Form.TextField
        id="baseUrl"
        title="Base URL"
        info="Production defaults to https://selemene.tryambakam.space"
        value={baseUrl}
        onChange={setBaseUrl}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        info={
          apiKeyStorageMode === "preference"
            ? "Managed in Raycast secure preferences. Open Extension Preferences to rotate it."
            : "Enter a new key to replace the saved one."
        }
        placeholder={
          apiKeyStorageMode === "preference"
            ? "Secure preference key present. Leave blank to validate it."
            : existingApiKey
              ? "Saved key present. Paste a new one to rotate it."
              : "nk_..."
        }
        value={apiKey}
        onChange={setApiKey}
      />
      {existingApiKey ? (
        <Form.Description
          title="Current Storage"
          text={
            apiKeyStorageMode === "preference"
              ? "A secure preference key is active. Leave the field blank to validate the current key, or open Extension Preferences to rotate it."
              : "A legacy local key is already stored. Paste a new key to rotate accounts, or leave this blank and submit to refresh the current profile and cache."
          }
        />
      ) : null}
    </Form>
  );
}
