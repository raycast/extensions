import React, { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { normalizeBaseUrl, validateSelemeneCredentials } from "../lib/api";
import { openCommand } from "../lib/navigation";
import { clearDashboardCache, syncDashboardSnapshot } from "../lib/queries";
import {
  clearStoredConfig,
  DEFAULT_BASE_URL,
  getStoredApiKey,
  getStoredBaseUrl,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [savedBaseUrl, savedApiKey] = await Promise.all([
        getStoredBaseUrl(),
        getStoredApiKey(),
      ]);
      setBaseUrl(savedBaseUrl);
      setExistingBaseUrl(savedBaseUrl);
      setExistingApiKey(savedApiKey);
      setIsLoading(false);
    };

    load();
  }, []);

  const handleSubmit = async (values: OnboardingValues) => {
    const resolvedApiKey = values.apiKey.trim() || existingApiKey;
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

      await saveStoredConfig({
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
            ? "Old account cache cleared and the new profile is warmed."
            : "Local cache warmed and ready.",
      });

      setExistingApiKey(resolvedApiKey);
      setExistingBaseUrl(resolvedBaseUrl);
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
        "This removes the saved key plus cached profile, readings, and pulse data from this Mac.",
      primaryAction: {
        style: Alert.ActionStyle.Destructive,
        title: "Clear Key and Cache",
      },
    });

    if (!confirmed) {
      return;
    }

    await clearStoredConfig();
    clearDashboardCache();
    setExistingApiKey("");
    setExistingBaseUrl(DEFAULT_BASE_URL);
    setApiKey("");

    await showToast({
      style: Toast.Style.Success,
      title: "Saved key and cache cleared",
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
        text="Connect Tryambakam Noesis to the Selemene Engine. Replacing the key clears the old local snapshot first, then warms the dashboard from the account attached to the new key."
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
        info="Enter a new key to replace the saved one."
        placeholder={
          existingApiKey
            ? "Saved key present. Paste a new one to rotate it."
            : "nk_..."
        }
        value={apiKey}
        onChange={setApiKey}
      />
      {existingApiKey ? (
        <Form.Description
          title="Current Key"
          text="A key is already stored locally. Paste a new key to rotate accounts, or leave this blank and submit to refresh the current profile and cache."
        />
      ) : null}
    </Form>
  );
}
