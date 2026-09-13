import { Action, ActionPanel, Form, Icon, Keyboard, Toast, open, showToast, useNavigation } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { useRef, useState } from "react";
import { defaultOwner, execute, listConnections, request, webUrl } from "../lib/client";
import { currentWorkspace, runInWorkspace, workspaceTitle } from "../lib/workspaces";
import { connectionLabel, titleCase } from "../lib/format";
import { integrationIcon, useDisplayIntegrations } from "../lib/integrations";
import {
  connectionHandoffCode,
  handoffFromExecution,
  newlyCreatedConnection,
  validatedIntegrationUrl,
  type IntegrationWithAuth,
  type OAuthClientSummary,
} from "../lib/connection-actions";
import {
  credentialFields,
  createNativeConnection,
  setupMethod,
  setupOAuthClients,
  startNativeOAuth,
  type SetupTarget,
} from "../lib/connection-setup";
import type { ExecutionResult } from "../lib/types";
import { ExecutionResultView } from "./execution-result";
import { SetupStatus } from "./setup-status";
import { WorkspaceAction } from "./workspace-command";

export interface ConnectionSetupDefaults {
  integration?: string;
  owner?: "user" | "org";
  template?: string;
  label?: string;
}

export function ConnectionSetupForm({
  initialIntegration,
  defaults = {},
  isRootView = false,
}: {
  isRootView?: boolean;
  initialIntegration?: string;
  defaults?: ConnectionSetupDefaults;
}) {
  const { pop } = useNavigation();
  const [workspace] = useState(currentWorkspace);
  const scoped = <T,>(fn: () => Promise<T>) => runInWorkspace(workspace!, fn);
  const { data, isLoading, error, revalidate } = useDisplayIntegrations();
  const integrations = [...((data ?? []) as IntegrationWithAuth[])].sort((a, b) => a.name.localeCompare(b.name));
  const directory = new Map(integrations.map((item) => [item.slug, item]));
  const [integration, setIntegration] = useState(defaults.integration ?? initialIntegration ?? "");
  const [integrationError, setIntegrationError] = useState<string>();
  const integrationRef = useRef<Form.Dropdown>(null);
  const selected = integrations.find((i) => i.slug === integration);
  const missingIntegration = Boolean(data && integration && !selected);
  const [owner, setOwner] = useState<"user" | "org">(defaults.owner ?? defaultOwner() ?? "user");
  const [template, setTemplate] = useState(defaults.template ?? "");
  const [label, setLabel] = useState(defaults.label ?? "");
  const method = selected?.authMethods.find((m) => m.template === template) ?? selected?.authMethods[0];
  const selectionKey = `${selected?.slug}/${owner}/${method?.template}`;
  const {
    data: apps,
    isLoading: loadingApps,
    error: appsError,
    revalidate: reloadApps,
  } = usePromise(
    async (slug: string, scope: "user" | "org", authTemplate: string, kind: string) => {
      if (!slug || kind !== "oauth") return { key: `${slug}/${scope}/${authTemplate}`, clients: [] };
      return scoped(async () => {
        const fresh = await setupMethod({ integration: slug, owner: scope, template: authTemplate });
        const clients = fresh.oauth?.enterpriseIdentityProvider
          ? []
          : setupOAuthClients(await request<OAuthClientSummary[]>("/api/oauth/clients"), slug, fresh, scope);
        return { key: `${slug}/${scope}/${authTemplate}`, clients };
      });
    },
    [selected?.slug ?? "", owner, method?.template ?? "", method?.kind ?? ""],
  );
  const clients = apps?.key === selectionKey ? apps.clients : [];
  const awaitingApps = method?.kind === "oauth" && (loadingApps || apps?.key !== selectionKey);
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientKey, setClientKey] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [pending, setPending] = useState<{ url: string; baseline: Set<string>; target: SetupTarget }>();
  const [created, setCreated] = useState("");
  const [paused, setPaused] = useState<{
    result: ExecutionResult;
    code: string;
    baseline: Set<string>;
    target: SetupTarget;
  }>();
  const fields = method && credentialFields(method);
  const selectedClient = clients.find((c) => `${c.owner}/${c.slug}` === clientKey) ?? clients[0];
  const browserSetup = Boolean(method && fields === undefined && !awaitingApps && !selectedClient && !appsError);

  function resetCredentials() {
    setValues({});
    setErrors({});
    setClientKey("");
  }

  async function submit() {
    if (lock.current || isLoading || error || awaitingApps || appsError) return;
    if (!selected) {
      setIntegrationError("Choose an integration.");
      integrationRef.current?.focus();
      return;
    }
    if (!method) return;
    const missing = Object.fromEntries(
      (fields ?? []).filter((key) => !values[key]?.trim()).map((key) => [key, "Required."]),
    );
    setErrors(missing);
    if (Object.keys(missing).length) return;
    const target = { integration: selected.slug, owner, template: method.template, label };
    lock.current = true;
    setBusy(true);
    try {
      if (fields) {
        const connection = await scoped(() => createNativeConnection(target, values));
        setValues({});
        setCreated(connectionLabel(connection));
      } else if (selectedClient) {
        const result = await scoped(() => startNativeOAuth(target, `${selectedClient.owner}/${selectedClient.slug}`));
        if (result.connection) setCreated(connectionLabel(result.connection));
        else if (result.url) {
          setPending({ url: result.url, baseline: result.baseline, target });
          await open(result.url);
        }
      } else if (browserSetup) {
        const code = connectionHandoffCode(target);
        const result = await scoped(async () => {
          await setupMethod(target);
          const before = await listConnections({ integration: target.integration, owner: target.owner });
          return { execution: await execute(code), baseline: new Set(before.map((c) => c.address)) };
        });
        if (result.execution.status === "paused") {
          setPaused({ result: result.execution, code, baseline: result.baseline, target });
          return;
        }
        await finishBrowserSetup(result.execution, result.baseline, target);
      }
    } catch (cause) {
      await showFailureToast(cause, { title: "Could Not Add Connection" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function finishBrowserSetup(result: ExecutionResult, baseline: Set<string>, target: SetupTarget) {
    const handoff = handoffFromExecution(result);
    const url = handoff && validatedIntegrationUrl(handoff.url, webUrl(), target.integration);
    if (!url) throw new Error("Executor did not return a valid setup URL for this server.");
    setPending({ url, baseline, target });
    setPaused(undefined);
    await open(url);
  }

  async function check() {
    if (lock.current || !pending) return;
    lock.current = true;
    setBusy(true);
    try {
      const rows = await scoped(() =>
        listConnections({ integration: pending.target.integration, owner: pending.target.owner }),
      );
      const connection = newlyCreatedConnection({ ...pending.target, baseline: pending.baseline }, rows);
      if (connection) {
        setCreated(connectionLabel(connection));
        setPending(undefined);
      } else
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Not Found Yet",
          message: "Finish setup in your browser, then check again.",
        });
    } catch (cause) {
      await showFailureToast(cause, { title: "Could Not Check Connection" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (paused)
    return (
      <ExecutionResultView
        initial={paused.result}
        code={paused.code}
        onResult={async (result) => {
          if (result.status !== "completed" || result.isError) return;
          try {
            await finishBrowserSetup(result, paused.baseline, paused.target);
          } catch (cause) {
            await showFailureToast(cause, { title: "Could Not Open Connection Setup" });
          }
        }}
      />
    );
  if (created) {
    return (
      <SetupStatus
        title="Connection Added"
        description={created}
        icon={integrationIcon(selected?.slug ?? "", directory)}
        actions={
          <ActionPanel>
            <Action title="Done" icon={Icon.Check} onAction={pop} />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
    );
  }
  return (
    <Form
      isLoading={isLoading || awaitingApps || busy}
      navigationTitle={isRootView ? undefined : workspaceTitle("Add Connection")}
      actions={
        <ActionPanel>
          {error || appsError || missingIntegration ? (
            <Action
              title="Reload Setup"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => (error || missingIntegration ? revalidate() : reloadApps())}
            />
          ) : pending ? (
            <>
              <Action
                title="Check Connection"
                icon={Icon.RotateClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={check}
              />
              <Action.OpenInBrowser title="Continue Setup" url={pending.url} />
            </>
          ) : (
            <Action.SubmitForm
              title={browserSetup ? "Continue in Executor" : selectedClient ? "Authorize Connection" : "Add Connection"}
              icon={browserSetup ? Icon.Globe : Icon.Plug}
              onSubmit={submit}
            />
          )}
          <ActionPanel.Section title="Navigation">
            <WorkspaceAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {error || appsError ? (
        <Form.Description title="Setup Unavailable" text={(error ?? appsError)!.message} />
      ) : pending ? (
        <Form.Description title="Complete Setup" text="Finish setup in your browser, then check the connection here." />
      ) : !data ? null : (
        <>
          <Form.Dropdown
            id="integration"
            ref={integrationRef}
            title="Integration"
            value={selected?.slug ?? ""}
            error={
              missingIntegration
                ? "This integration is unavailable. Reload or choose another integration."
                : integrationError
            }
            storeValue={false}
            onChange={(value) => {
              if (lock.current || value === integration || !integrations.some((item) => item.slug === value)) return;
              setIntegration(value);
              setIntegrationError(undefined);
              setTemplate("");
              resetCredentials();
            }}
          >
            {!selected ? <Form.Dropdown.Item title="Choose an integration" value="" /> : null}
            {integrations.map((i) => (
              <Form.Dropdown.Item
                key={i.slug}
                value={i.slug}
                title={i.name}
                icon={integrationIcon(i.slug, directory)}
              />
            ))}
          </Form.Dropdown>
          {selected ? (
            <>
              <Form.Dropdown
                id="owner"
                title="Used By"
                value={owner}
                onChange={(value) => {
                  if (lock.current) return;
                  setOwner(value as "user" | "org");
                  resetCredentials();
                }}
              >
                <Form.Dropdown.Item value="user" title="Personal" icon={Icon.Person} />
                <Form.Dropdown.Item value="org" title="Workspace" icon={Icon.TwoPeople} />
              </Form.Dropdown>
              <Form.Dropdown
                id="template"
                title="Authentication"
                value={method?.template ?? ""}
                onChange={(value) => {
                  if (lock.current) return;
                  setTemplate(value);
                  resetCredentials();
                }}
              >
                {selected?.authMethods.map((m) => (
                  <Form.Dropdown.Item
                    key={m.template}
                    value={m.template}
                    title={m.label}
                    icon={m.kind === "none" ? Icon.LockUnlocked : m.kind === "oauth" ? Icon.Globe : Icon.Key}
                  />
                ))}
              </Form.Dropdown>
              <Form.TextField
                id="label"
                title="Label"
                placeholder="Optional account label"
                value={label}
                onChange={(value) => {
                  if (!lock.current) setLabel(value);
                }}
              />
              {fields?.map((key) => (
                <Form.PasswordField
                  key={key}
                  id={`credential:${key}`}
                  title={key === "token" ? "Token" : titleCase(key)}
                  value={values[key] ?? ""}
                  error={errors[key]}
                  onBlur={() => setErrors((e) => ({ ...e, [key]: values[key]?.trim() ? "" : "Required." }))}
                  onChange={(value) => {
                    if (lock.current) return;
                    setValues((v) => ({ ...v, [key]: value }));
                    setErrors((e) => ({ ...e, [key]: "" }));
                  }}
                />
              ))}
              {fields?.length ? (
                <Form.Description text="Credentials are sent directly to this Executor workspace. They are not saved in Raycast or shared with AI." />
              ) : null}
              {selectedClient ? (
                <Form.Dropdown
                  id="client"
                  title="OAuth App"
                  value={`${selectedClient.owner}/${selectedClient.slug}`}
                  onChange={(value) => {
                    if (!lock.current) setClientKey(value);
                  }}
                >
                  {clients.map((c) => (
                    <Form.Dropdown.Item
                      key={`${c.owner}/${c.slug}`}
                      value={`${c.owner}/${c.slug}`}
                      title={`${c.slug} · ${c.owner === "org" ? "Workspace" : "Personal"}`}
                      icon={Icon.Key}
                    />
                  ))}
                </Form.Dropdown>
              ) : null}
              {browserSetup ? (
                <Form.Description text="This authentication method needs setup in Executor. Continue to finish in your browser." />
              ) : null}
              {!method && !isLoading ? (
                <Form.Description text="This integration has no available authentication methods. Configure it in Executor first." />
              ) : null}
            </>
          ) : null}
        </>
      )}
    </Form>
  );
}
