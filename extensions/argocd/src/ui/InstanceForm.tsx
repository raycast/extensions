import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useState } from "react";
import { clearSecrets } from "./deps";
import {
  ValidationError,
  credentialsInvalidatedBy,
  upsertInstance,
  validateInstance,
  type ArgoInstance,
  type AuthMode,
  type Environment,
} from "../lib/config/instances";

interface Props {
  instances: ArgoInstance[];
  editing?: ArgoInstance;
  onSaved: (instances: ArgoInstance[]) => Promise<void>;
}

export function InstanceForm({ instances, editing, onSaved }: Props) {
  const { pop } = useNavigation();
  const [name, setName] = useState(editing?.name ?? "");
  const [baseUrl, setBaseUrl] = useState(editing?.baseUrl ?? "");
  const [env, setEnv] = useState<Environment>(editing?.env ?? "dev");
  const [authMode, setAuthMode] = useState<AuthMode>(editing?.authMode ?? "sso");
  const [allowWrite, setAllowWrite] = useState(editing?.allowWrite ?? false);
  const [enabled, setEnabled] = useState(editing?.enabled ?? true);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});

  const isProd = env === "prod";

  async function submit() {
    setErrors({});
    try {
      const instance = validateInstance(
        {
          ...(editing ? { id: editing.id } : {}),
          name,
          baseUrl,
          env,
          authMode,
          allowWrite,
          enabled,
        },
        instances,
        () => randomUUID(),
      );
      // An edit keeps the id, so the stored credential outlives it. Pointing the instance at
      // another server or switching its auth mode makes that credential wrong, and the token
      // reader cannot notice: it returns a live session without asking the server anything.
      // Dropped here instead, which keeps that fast path free.
      const previous = instances.find((candidate) => candidate.id === instance.id);
      if (previous && credentialsInvalidatedBy(previous, instance)) {
        await clearSecrets(instance.id);
      }
      await onSaved(upsertInstance(instances, instance));
      pop();
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ [error.field]: error.message });
        return;
      }
      throw error;
    }
  }

  return (
    <Form
      navigationTitle={editing ? `Edit ${editing.name}` : "Add an ArgoCD instance"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={editing ? "Save Instance" : "Add Instance"} icon={Icon.Check} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="prod-tooling"
        info="How this instance is labelled in the search results."
        value={name}
        error={errors.name}
        onChange={setName}
      />
      <Form.TextField
        id="baseUrl"
        title="Server URL"
        placeholder="https://argocd.example.com"
        info="The base URL of the ArgoCD web UI. https only."
        value={baseUrl}
        error={errors.baseUrl}
        onChange={setBaseUrl}
      />
      <Form.Dropdown
        id="env"
        title="Environment"
        value={env}
        onChange={(value) => {
          const next = value as Environment;
          setEnv(next);
          if (next === "prod") {
            setAllowWrite(false);
          }
        }}
      >
        <Form.Dropdown.Item value="prod" title="Production" icon={Icon.Warning} />
        <Form.Dropdown.Item value="preprod" title="Pre-production" />
        <Form.Dropdown.Item value="dev" title="Development" />
      </Form.Dropdown>
      <Form.Dropdown
        id="authMode"
        title="Authentication"
        value={authMode}
        onChange={(value) => setAuthMode(value as AuthMode)}
        info="Single sign-on logs in once from here and renews itself. The CLI session reuses what argocd login --sso already stored and renews that too, so one login serves the CLI, this extension and any other ArgoCD tool. Both need the identity provider to register the loopback redirect. The API token needs nothing but carries a service account's identity rather than yours. See the README."
      >
        <Form.Dropdown.Item value="sso" title="Single sign-on, renewed silently" icon={Icon.Fingerprint} />
        <Form.Dropdown.Item value="cli" title="argocd CLI session, renewed silently" icon={Icon.Terminal} />
        <Form.Dropdown.Item value="token" title="API token" icon={Icon.Key} />
      </Form.Dropdown>
      {authMode === "sso" ? (
        <Form.Description
          title="After saving"
          text="Use Log in with single sign-on from Manage Instances. The browser opens once, and from then on the session renews itself before every request that needs it."
        />
      ) : null}
      <Form.Separator />
      <Form.Checkbox
        id="allowWrite"
        label="Allow sync and other write operations"
        value={allowWrite}
        onChange={setAllowWrite}
        info={
          isProd
            ? "Disabled for a production instance. Change the environment first if you really need write actions here."
            : "When off, the sync actions are hidden and the client refuses any write."
        }
      />
      {isProd ? (
        <Form.Description
          title="Production"
          text="Write actions stay off on a production instance. Server-side RBAC is the real control; this keeps an accidental keystroke from ever reaching it."
        />
      ) : null}
      <Form.Checkbox
        id="enabled"
        label="Include in searches"
        value={enabled}
        onChange={setEnabled}
        info="Turn off to keep the instance configured without querying it."
      />
    </Form>
  );
}
