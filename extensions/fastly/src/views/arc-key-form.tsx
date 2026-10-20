import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { ArcProvider, ArcVirtualKey, ArcVirtualKeyWithToken } from "../types";
import { getArcProviders, createArcVirtualKey, updateArcVirtualKey } from "../api";
import { ArcKeyTokenDetail } from "./arc-key-token";
import { resolveProvider } from "../utils/arc-providers";
import { FormValidation, useForm } from "@raycast/utils";

interface ArcKeyFormProps {
  existingKey?: ArcVirtualKey;
  onSaved?: () => void;
}

interface ArcKeyFormValues {
  name: string;
  provider: string;
  model: string;
  expiresAt: Date | null;
  securityEnabled: boolean;
  securityAction: string;
  rpmLimit: string;
  tpmLimit: string;
}

function validateLimit(raw?: string): string | undefined {
  if (raw && (!/^\d+$/.test(raw.trim()) || Number(raw.trim()) <= 0)) {
    return "Must be a positive integer";
  }
}

// Returns the limit to send: a number to set, null to clear an existing one, undefined to leave unchanged
function limitPayload(raw: string, existing: number | null | undefined, isEditing: boolean): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed) {
    return Number(trimmed);
  }
  return isEditing && existing != null ? null : undefined;
}

export function ArcKeyForm({ existingKey, onSaved }: ArcKeyFormProps) {
  const [providers, setProviders] = useState<ArcProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // The key's model when it isn't in the provider's current catalog; kept selectable while editing
  const legacy = useRef<{ providerId: string; model: string } | null>(null);
  const { push, pop } = useNavigation();
  const isEditing = !!existingKey;

  const { handleSubmit, itemProps, values, setValue } = useForm<ArcKeyFormValues>({
    async onSubmit(formValues) {
      try {
        setIsLoading(true);
        const selectedProvider = providers.find((provider) => provider.id === formValues.provider);
        const payload = {
          name: formValues.name,
          // Store the display name, matching keys created in the Fastly control panel
          provider: selectedProvider?.display_name || formValues.provider,
          model: formValues.model,
          expires_at: formValues.expiresAt ? formValues.expiresAt.toISOString() : undefined,
          security_enabled: formValues.securityEnabled,
          security_action: formValues.securityEnabled ? formValues.securityAction : undefined,
        };

        if (isEditing) {
          await updateArcVirtualKey(existingKey.id, {
            ...payload,
            rpm_limit: limitPayload(formValues.rpmLimit, existingKey.rpm_limit, true),
            tpm_limit: limitPayload(formValues.tpmLimit, existingKey.tpm_limit, true),
          });
          await showToast({ style: Toast.Style.Success, title: "Virtual key updated", message: formValues.name });
          onSaved?.();
          pop();
        } else {
          const created: ArcVirtualKeyWithToken = await createArcVirtualKey({
            ...payload,
            rpm_limit: limitPayload(formValues.rpmLimit, undefined, false) ?? undefined,
            tpm_limit: limitPayload(formValues.tpmLimit, undefined, false) ?? undefined,
          });
          await showToast({ style: Toast.Style.Success, title: "Virtual key created", message: formValues.name });
          onSaved?.();
          push(<ArcKeyTokenDetail keyRecord={created} />);
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isEditing ? "Failed to update virtual key" : "Failed to create virtual key",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      name: existingKey?.name || "",
      provider: "",
      model: "",
      expiresAt: existingKey?.expires_at ? new Date(existingKey.expires_at) : null,
      securityEnabled: existingKey?.security_enabled ?? false,
      securityAction: existingKey?.security_action === "block" ? "block" : "log",
      rpmLimit: existingKey?.rpm_limit != null ? String(existingKey.rpm_limit) : "",
      tpmLimit: existingKey?.tpm_limit != null ? String(existingKey.tpm_limit) : "",
    },
    validation: {
      name: FormValidation.Required,
      provider: FormValidation.Required,
      model: FormValidation.Required,
      rpmLimit: validateLimit,
      tpmLimit: validateLimit,
      expiresAt: (expiresAt) => {
        // The API treats a missing/null expires_at as "unchanged", so an
        // expiration can't be removed once set — surface that instead of
        // silently no-oping.
        if (isEditing && existingKey?.expires_at && !expiresAt) {
          return "An expiration can't be removed via the API — pick a new date instead";
        }
      },
    },
  });

  useEffect(() => {
    async function loadProviders() {
      try {
        const response = await getArcProviders();
        const loaded = response.data || [];
        setProviders(loaded);

        if (existingKey) {
          const provider = resolveProvider(loaded, existingKey.provider);
          if (provider) {
            const model = provider.models.find(
              (m) =>
                m.id.toLowerCase() === existingKey.model.toLowerCase() ||
                m.display_name.toLowerCase() === existingKey.model.toLowerCase(),
            );
            if (!model) {
              legacy.current = { providerId: provider.id, model: existingKey.model };
            }
            setValue("provider", provider.id);
            setValue("model", model?.id || existingKey.model);
          } else {
            // Provider isn't in the catalog at all; keep the raw values selectable
            legacy.current = { providerId: existingKey.provider, model: existingKey.model };
            setValue("provider", existingKey.provider);
            setValue("model", existingKey.model);
          }
        } else if (loaded.length > 0) {
          setValue("provider", loaded[0].id);
          setValue("model", loaded[0].models[0]?.id || "");
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load providers",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    loadProviders();
  }, []);

  const selectedProvider = providers.find((provider) => provider.id === values.provider);
  const models = selectedProvider?.models || [];
  const unknownProvider = !isLoading && !!values.provider && !selectedProvider;
  const showLegacyModel = legacy.current !== null && values.provider === legacy.current.providerId;

  // Keep the model valid when the provider changes to one that doesn't offer it
  useEffect(() => {
    if (showLegacyModel && values.model === legacy.current?.model) {
      return;
    }
    if (models.length > 0 && !models.some((model) => model.id === values.model)) {
      setValue("model", models[0].id);
    }
  }, [values.provider, providers]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEditing ? `Edit ${existingKey.name}` : "Create Virtual Key"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Key" : "Create Key"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Name" placeholder="e.g. production-chatbot" {...itemProps.name} />
      <Form.Dropdown title="Provider" {...itemProps.provider}>
        {providers.map((provider) => (
          <Form.Dropdown.Item key={provider.id} value={provider.id} title={provider.display_name} />
        ))}
        {unknownProvider && <Form.Dropdown.Item value={values.provider} title={values.provider} />}
      </Form.Dropdown>
      <Form.Dropdown title="Model" {...itemProps.model}>
        {models.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.display_name} />
        ))}
        {showLegacyModel && legacy.current && (
          <Form.Dropdown.Item value={legacy.current.model} title={legacy.current.model} />
        )}
      </Form.Dropdown>
      <Form.DatePicker
        title="Expiration"
        info="Optional. The key stops working after this date."
        type={Form.DatePicker.Type.DateTime}
        {...itemProps.expiresAt}
      />

      <Form.Separator />

      <Form.TextField
        title="Rate Limit (Requests/Min)"
        placeholder="No limit"
        info="Maximum requests per minute. Leave blank for no limit."
        {...itemProps.rpmLimit}
      />
      <Form.TextField
        title="Rate Limit (Tokens/Min)"
        placeholder="No limit"
        info="Maximum tokens per minute. Leave blank for no limit."
        {...itemProps.tpmLimit}
      />

      <Form.Checkbox
        title="AI Firewall"
        label="Enable real-time security inspection"
        info="Analyzes payloads inline to catch runtime threats and protect sensitive data"
        {...itemProps.securityEnabled}
      />
      {values.securityEnabled && (
        <Form.Dropdown
          title="Firewall Action"
          info="What to do when a threat is detected"
          {...itemProps.securityAction}
        >
          <Form.Dropdown.Item value="log" title="Log" />
          <Form.Dropdown.Item value="block" title="Block" />
        </Form.Dropdown>
      )}
    </Form>
  );
}
