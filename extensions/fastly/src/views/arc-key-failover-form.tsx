import { Form, ActionPanel, Action, List, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { ArcProvider, ArcProviderConnection, ArcVirtualKey } from "../types";
import { getArcKeyFailover, putArcKeyFailover, getArcProviderConnections, getArcProviders } from "../api";
import { FormValidation, useForm } from "@raycast/utils";
import { resolveProvider, providerDisplayName } from "../utils/arc-providers";

interface ArcKeyFailoverFormProps {
  keyRecord: ArcVirtualKey;
}

interface FailoverFormValues {
  target1: string;
  target2: string;
  target3: string;
  timeoutEnabled: boolean;
  rateLimit429Enabled: boolean;
  serverError5xxEnabled: boolean;
}

const NONE = "";

export function ArcKeyFailoverForm({ keyRecord }: ArcKeyFailoverFormProps) {
  const [connections, setConnections] = useState<ArcProviderConnection[]>([]);
  const [providers, setProviders] = useState<ArcProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const { pop } = useNavigation();

  const { handleSubmit, itemProps, values, setValue } = useForm<FailoverFormValues>({
    async onSubmit(formValues) {
      // P3 is hidden (and ignored) while P2 is unset
      const rawTargets =
        formValues.target2 === NONE
          ? [formValues.target1]
          : [formValues.target1, formValues.target2, formValues.target3];
      const targets = rawTargets.filter((target) => target !== NONE);

      if (new Set(targets).size !== targets.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Duplicate targets",
          message: "Each provider connection can only appear once in the failover order.",
        });
        return;
      }

      try {
        setIsLoading(true);
        await putArcKeyFailover(keyRecord.id, {
          targets: targets.map((id) => ({ provider_connection_id: id })),
          timeout_enabled: formValues.timeoutEnabled,
          rate_limit_429_enabled: formValues.rateLimit429Enabled,
          server_error_5xx_enabled: formValues.serverError5xxEnabled,
        });
        await showToast({ style: Toast.Style.Success, title: "Failover policy updated", message: keyRecord.name });
        pop();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update failover policy",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    },
    initialValues: {
      target1: NONE,
      target2: NONE,
      target3: NONE,
      timeoutEnabled: true,
      rateLimit429Enabled: true,
      serverError5xxEnabled: true,
    },
    validation: {
      target1: FormValidation.Required,
    },
  });

  useEffect(() => {
    async function load() {
      try {
        const [failover, connectionsResponse, providersResponse] = await Promise.all([
          getArcKeyFailover(keyRecord.id),
          getArcProviderConnections(),
          getArcProviders(),
        ]);

        if (failover === null) {
          setUnavailable(true);
          return;
        }

        const loadedConnections = connectionsResponse.data || [];
        setConnections(loadedConnections);
        setProviders(providersResponse.data || []);

        // The API returns the trigger toggles even when no targets are set yet
        setValue("timeoutEnabled", failover.timeout_enabled);
        setValue("rateLimit429Enabled", failover.rate_limit_429_enabled);
        setValue("serverError5xxEnabled", failover.server_error_5xx_enabled);

        const targets = failover.targets || [];
        if (targets.length > 0) {
          setValue("target1", targets[0]?.provider_connection_id || NONE);
          setValue("target2", targets[1]?.provider_connection_id || NONE);
          setValue("target3", targets[2]?.provider_connection_id || NONE);
        } else {
          // No targets yet: default the primary to the connection matching the key's provider
          const match = loadedConnections.find(
            (connection) =>
              resolveProvider(providersResponse.data || [], connection.name) ===
                resolveProvider(providersResponse.data || [], keyRecord.provider) ||
              connection.name.toLowerCase() === keyRecord.provider.toLowerCase(),
          );
          if (match) {
            setValue("target1", match.id);
          }
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load failover policy",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  if (unavailable) {
    return (
      <List navigationTitle={`Failover — ${keyRecord.name}`}>
        <List.EmptyView
          title="Failover Not Available"
          description="Provider failover isn't enabled for this account yet. Contact Fastly to enable it."
          icon={Icon.Lock}
        />
      </List>
    );
  }

  function connectionTitle(connection: ArcProviderConnection): string {
    return providerDisplayName(providers, connection.name);
  }

  function targetDropdown(title: string, props: typeof itemProps.target1, required: boolean) {
    return (
      <Form.Dropdown title={title} {...props}>
        {!required && <Form.Dropdown.Item value={NONE} title="None" />}
        {connections.map((connection) => (
          <Form.Dropdown.Item key={connection.id} value={connection.id} title={connectionTitle(connection)} />
        ))}
      </Form.Dropdown>
    );
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={`Failover — ${keyRecord.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Failover Policy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Ordered list of provider connections for this key. If the primary target fails, traffic is retried against the next target." />
      {targetDropdown("Primary (P1)", itemProps.target1, true)}
      {targetDropdown("Failover (P2)", itemProps.target2, false)}
      {values.target2 !== NONE && targetDropdown("Failover (P3)", itemProps.target3, false)}

      <Form.Separator />

      <Form.Checkbox title="Trigger On" label="Timeouts" {...itemProps.timeoutEnabled} />
      <Form.Checkbox label="Rate limiting (429 responses)" {...itemProps.rateLimit429Enabled} />
      <Form.Checkbox label="Server errors (5xx responses)" {...itemProps.serverError5xxEnabled} />
    </Form>
  );
}
