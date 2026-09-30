import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ArcProvider, ArcProviderConnection } from "../types";
import { createArcProviderConnection, updateArcProviderConnection } from "../api";
import { FormValidation, useForm } from "@raycast/utils";
import { isSameProvider } from "../utils/arc-providers";

interface ArcConnectionFormProps {
  providers: ArcProvider[];
  connections: ArcProviderConnection[];
  existingConnection?: ArcProviderConnection;
  onSaved?: () => void;
}

interface ArcConnectionFormValues {
  provider: string;
  models: string[];
  baseUrl: string;
  apiKey: string;
  authType: string;
  customerRoleArn: string;
  region: string;
}

export function ArcConnectionForm({ providers, connections, existingConnection, onSaved }: ArcConnectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { pop } = useNavigation();
  const isEditing = !!existingConnection;

  // Only one connection per provider is allowed, so hide already-connected providers when creating
  const availableProviders = isEditing
    ? providers
    : providers.filter(
        (provider) => !connections.some((connection) => isSameProvider(providers, connection.name, provider.id)),
      );

  const { handleSubmit, itemProps, values, setValue } = useForm<ArcConnectionFormValues>({
    async onSubmit(formValues) {
      const isAwsIam = formValues.authType === "aws-iam";
      try {
        setIsLoading(true);
        if (isEditing) {
          await updateArcProviderConnection(existingConnection.id, {
            models: formValues.models,
            ...(existingConnection.auth_type === "aws-iam"
              ? { customer_role_arn: formValues.customerRoleArn || undefined, region: formValues.region || undefined }
              : { base_url: formValues.baseUrl, ...(formValues.apiKey ? { api_key: formValues.apiKey } : {}) }),
          });
          await showToast({ style: Toast.Style.Success, title: "Provider connection updated" });
        } else {
          await createArcProviderConnection({
            name: formValues.provider,
            models: formValues.models,
            ...(isAwsIam
              ? { auth_type: "aws-iam", customer_role_arn: formValues.customerRoleArn, region: formValues.region }
              : { auth_type: "api-key", base_url: formValues.baseUrl, api_key: formValues.apiKey }),
          });
          await showToast({ style: Toast.Style.Success, title: "Provider connection created" });
        }
        onSaved?.();
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: isEditing ? "Failed to update provider connection" : "Failed to create provider connection",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      provider: existingConnection?.name || availableProviders[0]?.id || "",
      models: existingConnection?.models || [],
      baseUrl: existingConnection?.base_url || "",
      apiKey: "",
      authType: existingConnection?.auth_type || "api-key",
      customerRoleArn: "",
      region: existingConnection?.region || "",
    },
    validation: {
      provider: FormValidation.Required,
      models: (models) => {
        if (!models || models.length === 0) {
          return "Select at least one model";
        }
      },
      baseUrl: (baseUrl) => {
        if (values.authType !== "aws-iam" && !baseUrl) {
          return "Base URL is required";
        }
      },
      apiKey: (apiKey) => {
        if (values.authType !== "aws-iam" && !isEditing && !apiKey) {
          return "API key is required";
        }
      },
      customerRoleArn: (arn) => {
        if (values.authType === "aws-iam" && !isEditing && !arn) {
          return "Role ARN is required";
        }
      },
      region: (region) => {
        if (values.authType === "aws-iam" && !region) {
          return "Region is required";
        }
      },
    },
  });

  const selectedProvider = providers.find((provider) => provider.id === values.provider);
  const providerModels = selectedProvider?.models || [];
  // Keep any models already on the connection selectable even if the catalog no longer lists them
  const extraModels = (values.models || []).filter((model) => !providerModels.some((m) => m.id === model));
  const isAwsIam = values.authType === "aws-iam";

  // When the provider changes on create, reset dependent fields to that provider's defaults
  useEffect(() => {
    if (isEditing) return;
    setValue("models", []);
    setValue("baseUrl", selectedProvider?.default_base_url || "");
    if (values.provider !== "bedrock" && values.authType === "aws-iam") {
      setValue("authType", "api-key");
    }
  }, [values.provider]);

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={isEditing ? `Edit ${existingConnection.name} Connection` : "Add Provider Connection"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEditing ? "Update Connection" : "Create Connection"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {isEditing ? (
        <Form.Description text={`Provider: ${existingConnection.name}`} />
      ) : (
        <Form.Dropdown title="Provider" {...itemProps.provider}>
          {availableProviders.map((provider) => (
            <Form.Dropdown.Item key={provider.id} value={provider.id} title={provider.display_name} />
          ))}
        </Form.Dropdown>
      )}

      {!isEditing && values.provider === "bedrock" && (
        <Form.Dropdown title="Authentication" {...itemProps.authType}>
          <Form.Dropdown.Item value="api-key" title="API Key" />
          <Form.Dropdown.Item value="aws-iam" title="AWS IAM Role" />
        </Form.Dropdown>
      )}

      <Form.TagPicker title="Models" info="Models this connection is allowed to serve" {...itemProps.models}>
        {providerModels.map((model) => (
          <Form.TagPicker.Item key={model.id} value={model.id} title={model.display_name} />
        ))}
        {extraModels.map((model) => (
          <Form.TagPicker.Item key={model} value={model} title={model} />
        ))}
      </Form.TagPicker>

      {isAwsIam ? (
        <>
          <Form.TextField
            title="IAM Role ARN"
            placeholder="arn:aws:iam::123456789012:role/fastly-arc"
            info="The IAM role in your AWS account that AI Runtime Control assumes to call Bedrock"
            {...itemProps.customerRoleArn}
          />
          <Form.TextField title="AWS Region" placeholder="us-east-1" {...itemProps.region} />
        </>
      ) : (
        <>
          <Form.TextField title="Base URL" placeholder="https://api.example.com" {...itemProps.baseUrl} />
          <Form.PasswordField
            title="API Key"
            placeholder={isEditing ? "Leave blank to keep the current key" : "Enter the provider's API key"}
            info="Stored encrypted by Fastly and never shown again"
            {...itemProps.apiKey}
          />
        </>
      )}
    </Form>
  );
}
