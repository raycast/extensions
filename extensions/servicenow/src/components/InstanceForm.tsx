import { useMemo, useState } from "react";
import { ActionPanel, Action, Form, Icon, useNavigation, Color, Keyboard, confirmAlert, Alert } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import crypto from "crypto";
import { AuthMode, Instance } from "../types";
import { normalizeInstanceName } from "../utils/instanceUrl";
import { authorizeInstance } from "../utils/oauth";

type InstanceFormValues = Omit<Instance, "id" | "authMode" | "accessToken" | "refreshToken" | "tokenExpiresAt"> & {
  authMode: string;
};

type SetInstanceFormProps = {
  onSubmit: (value: Instance) => Promise<void>;
  onDelete?: (instanceId: string) => Promise<void>;
  instance?: Instance;
  initialName?: string;
};

export default function InstanceForm({ onSubmit, onDelete, instance, initialName }: SetInstanceFormProps) {
  const { pop } = useNavigation();

  const [authMode, setAuthMode] = useState<AuthMode>(instance?.authMode ?? "basic");

  const { itemProps, handleSubmit } = useForm<InstanceFormValues>({
    async onSubmit(values) {
      const normalized = {
        ...values,
        name: normalizeInstanceName(values.name),
        authMode: values.authMode as AuthMode,
      };
      let next: Instance = instance ? { ...instance, ...normalized } : { ...normalized, id: crypto.randomUUID() };

      if (next.authMode === "oauth") {
        next = { ...next, username: undefined, password: undefined };

        const needsAuth =
          !instance ||
          instance.authMode !== "oauth" ||
          instance.clientId !== next.clientId ||
          !instance.accessToken ||
          !instance.refreshToken;

        if (needsAuth) {
          try {
            const tokens = await authorizeInstance(next);
            next = { ...next, ...tokens };
          } catch (error) {
            await showFailureToast(error, { title: "OAuth sign-in failed" });
            return;
          }
        }
      } else {
        next = {
          ...next,
          clientId: undefined,
          accessToken: undefined,
          refreshToken: undefined,
          tokenExpiresAt: undefined,
          oauthUserName: undefined,
        };
      }

      await onSubmit(next);
      pop();
    },
    initialValues: {
      name: instance?.name ?? initialName,
      alias: instance?.alias,
      color: instance?.color,
      authMode: instance?.authMode ?? "basic",
      username: instance?.username,
      password: instance?.password,
      clientId: instance?.clientId,
      full: instance?.full,
    },
    validation: {
      name: (value) => {
        if (!value?.trim()) return "Missing instance URL";
      },
      username: (value) => {
        if (authMode === "basic" && !value?.trim()) return "Missing username";
      },
      password: (value) => {
        if (authMode === "basic" && !value?.trim()) return "Missing password";
      },
    },
  });

  const colors = useMemo(() => Object.entries(Color), []);

  let title;
  if (instance) {
    title = "Edit";
  } else {
    title = "Add";
  }

  return (
    <Form
      navigationTitle={"Manage Instance Profiles - " + title}
      enableDrafts={!instance}
      isLoading={false}
      actions={
        <ActionPanel>
          <ActionPanel.Section
            title={`${instance?.alias ? instance.alias + " (" + instance.name + ")" : instance?.name}`}
          >
            <Action.SubmitForm onSubmit={handleSubmit} icon={Icon.SaveDocument} title={"Save"} />
            {instance && onDelete && (
              <Action
                title="Delete"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() =>
                  confirmAlert({
                    title: "Delete Instance Profile",
                    message: `Are you sure you want to delete "${instance.alias ? instance.alias + " (" + instance.name + ")" : instance.name}"?`,
                    primaryAction: {
                      style: Alert.ActionStyle.Destructive,
                      title: "Delete",
                      onAction: async () => {
                        await onDelete(instance.id);
                        pop();
                      },
                    },
                  })
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Download Default OAuth Client"
              icon={Icon.Download}
              url="https://developer.servicenow.com/connect.do#!/share/contents/3108109_raycast_extension_default_oauth_client"
            />
            <Action.OpenInBrowser
              title="Download ACLs for Non-Admin Users"
              icon={Icon.Download}
              url="https://developer.servicenow.com/connect.do#!/share/contents/3108109_servicenow_raycast_extension"
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.name}
        title="Instance URL"
        placeholder="acme or https://sn.internal.corp"
        info={`Subdomain (e.g. "acme") or full URL (e.g. https://acme.service-now.com, https://gov.servicenowservices.com, https://sn.internal.corp).`}
      />
      <Form.TextField
        {...itemProps.alias}
        title="Alias"
        placeholder="Production"
        info="Use an alias to easily recognize your instance"
      />
      <Form.Dropdown {...itemProps.color} title="Color">
        {colors.map(([key, value]) => {
          return (
            <Form.Dropdown.Item
              key={key}
              title={key}
              value={value.toString()}
              icon={{ source: Icon.Circle, tintColor: key }}
            />
          );
        })}
      </Form.Dropdown>
      <Form.Separator />
      <Form.Dropdown
        {...itemProps.authMode}
        title="Authentication"
        info="Basic uses your username and password. OAuth 2.0 uses an OAuth client registered in your ServiceNow instance."
        onChange={(value) => {
          setAuthMode(value as AuthMode);
          itemProps.authMode.onChange?.(value);
        }}
      >
        <Form.Dropdown.Item key="basic" title="Basic Auth" value="basic" icon={Icon.Key} />
        <Form.Dropdown.Item key="oauth" title="OAuth 2.0 (PKCE)" value="oauth" icon={Icon.Fingerprint} />
      </Form.Dropdown>
      {authMode === "basic" ? (
        <>
          <Form.TextField {...itemProps.username} title="Username" placeholder="Enter a username" />
          <Form.PasswordField {...itemProps.password} title="Password" />
        </>
      ) : (
        <>
          <Form.TextField
            {...itemProps.clientId}
            title="OAuth Client ID"
            placeholder="Leave empty to use the default Raycast client"
            info="Leave empty to use the default Raycast OAuth client (download it from the Actions menu and import into your instance). Override only to use your own oauth_entity record."
          />
          {instance?.accessToken ? (
            <Form.Description
              title="Status"
              text={
                instance.oauthUserName
                  ? `Signed in as ${instance.oauthUserName}. Tokens are stored locally.`
                  : "Signed in. Tokens are stored locally."
              }
            />
          ) : (
            <Form.Description
              title="Status"
              text="Not signed in. The browser will open after saving to complete the OAuth flow."
            />
          )}
        </>
      )}
      <Form.Separator />
      <Form.Description
        title="Full Version"
        text={`Enable the full version if this is an admin account, or if the ACLs for Non-Admin Users update set is installed on the instance.`}
      />
      <Form.Dropdown
        {...itemProps.full}
        info={`Full version includes:\n- Manage your Favorites\n- View your Search History\n- View your full Navigation History (limited otherwise)\n\nUse the Actions menu to download the update set.`}
      >
        <Form.Dropdown.Item
          key="yes"
          title="Yes"
          value="true"
          icon={{ source: Icon.LockDisabled, tintColor: Color.Green }}
        />
        <Form.Dropdown.Item key="no" title="No" value="false" icon={{ source: Icon.Lock, tintColor: Color.Orange }} />
      </Form.Dropdown>
    </Form>
  );
}
