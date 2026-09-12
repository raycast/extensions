import { Action, ActionPanel, Form, Icon, Keyboard, open, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { integrationSetupPath, KIND_LABEL, type CatalogItem, type CatalogKind } from "../lib/catalog";
import { consoleUrl } from "../lib/console";
import { integrationIcon } from "../lib/integrations";
import { INTEGRATION_KIND_ICON } from "../lib/integration-kind-icons";
import {
  advancedSetupReason,
  createIntegration,
  normalizeIntegrationSetupInput,
  previewIntegration,
  resolveIntegrationSetupDefaults,
  slugifyIntegrationName,
  type IntegrationCreationResult,
  type IntegrationSetupDefaults,
  type IntegrationSetupInput,
} from "../lib/integration-setup";
import { currentWorkspace, runInWorkspace, workspaceTitle } from "../lib/workspaces";
import { ConnectionSetupForm } from "./connection-setup-form";
import { SetupStatus } from "./setup-status";
import { WorkspaceAction } from "./workspace-command";

export function IntegrationSetupForm({
  defaults = {},
  item,
}: {
  defaults?: IntegrationSetupDefaults;
  item?: CatalogItem;
}) {
  const { pop } = useNavigation();
  const [workspace] = useState(currentWorkspace);
  const scoped = <T,>(fn: () => Promise<T>) => runInWorkspace(workspace!, fn);
  const {
    data: resolved,
    isLoading,
    error: loadError,
    revalidate,
  } = usePromise(
    async (setupKey: string) => {
      void setupKey;
      return resolveIntegrationSetupDefaults(defaults, item);
    },
    [JSON.stringify([item?.id, defaults.kind, defaults.domain, defaults.catalogSlug, defaults.endpoint])],
  );
  const [kind, setKind] = useState<CatalogKind>(defaults.kind ?? item?.kind ?? "mcp");
  const [endpoint, setEndpoint] = useState(defaults.endpoint ?? item?.url ?? "");
  const [name, setName] = useState(item?.title ?? "");
  const [slug, setSlug] = useState(item?.slug ?? defaults.catalogSlug ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [catalog, setCatalog] = useState<IntegrationSetupInput["catalog"]>();
  const [authentication, setAuthentication] = useState("detected");
  const [authName, setAuthName] = useState("Authorization");
  const [authPrefix, setAuthPrefix] = useState("Bearer ");
  const [slugEdited, setSlugEdited] = useState(Boolean(item?.slug ?? defaults.catalogSlug));
  const [loaded, setLoaded] = useState<string>();
  const [created, setCreated] = useState<IntegrationCreationResult>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const validationRun = useRef(0);

  useEffect(() => {
    if (!resolved) return;
    const key = JSON.stringify(resolved);
    if (loaded === key) return;
    setKind(resolved.kind);
    setEndpoint(resolved.endpoint);
    setName(resolved.name);
    setSlug(resolved.slug);
    setDescription(resolved.description ?? "");
    setCatalog(resolved.catalog);
    setSlugEdited(Boolean(resolved.catalog?.slug));
    setLoaded(key);
  }, [loaded, resolved]);

  const input = useMemo<IntegrationSetupInput>(
    () => ({
      kind,
      endpoint,
      name,
      slug,
      ...(description.trim() ? { description } : {}),
      ...(authentication === "none"
        ? { authentication: { kind: "none" as const } }
        : authentication === "oauth2"
          ? { authentication: { kind: "oauth2" as const } }
          : authentication === "bearer"
            ? {
                authentication: {
                  kind: "apiKey" as const,
                  carrier: "header" as const,
                  name: "Authorization",
                  prefix: "Bearer ",
                },
              }
            : authentication === "header" || authentication === "query"
              ? {
                  authentication: {
                    kind: "apiKey" as const,
                    carrier: authentication as "header" | "query",
                    name: authName,
                    prefix: authPrefix,
                  },
                }
              : {}),
      ...(catalog ? { catalog } : {}),
    }),
    [kind, endpoint, name, slug, description, authentication, authName, authPrefix, catalog],
  );
  const advancedReason = advancedSetupReason(input);
  // OpenAPI document hosts can differ from the provider, so only use its catalog domain.
  const displayUrl = kind === "openapi" ? (catalog?.domain ? `https://${catalog.domain}` : undefined) : endpoint;
  const providerIcon = integrationIcon(slug, new Map([[slug, { displayUrl, kind, logoDomain: catalog?.domain }]]));

  function changed() {
    validationRun.current += 1;
    setGeneralError(undefined);
  }

  function clearError(field: string) {
    setErrors((current) => ({ ...current, [field]: "" }));
    changed();
  }

  function localErrors(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!endpoint.trim()) next.endpoint = kind === "openapi" ? "Enter a specification." : "Enter an endpoint URL.";
    if (!name.trim()) next.name = "Enter a display name.";
    if (!slug.trim()) next.slug = "Enter a namespace.";
    else if (slugifyIntegrationName(slug) !== slug) next.slug = "Use lowercase letters, numbers, and underscores.";
    if ((authentication === "header" || authentication === "query") && !authName.trim()) {
      next.authName = authentication === "header" ? "Enter a header name." : "Enter a query parameter.";
    }
    if (Object.keys(next).length === 0) {
      try {
        normalizeIntegrationSetupInput(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Review this value.";
        if (/URL|endpoint|specification|query parameters/i.test(message)) next.endpoint = message;
        else if (/namespace/i.test(message)) next.slug = message;
        else if (/display name/i.test(message)) next.name = message;
        else if (/header|query parameter name/i.test(message)) next.authName = message;
        else next.form = message;
      }
    }
    return next;
  }

  function validateField(field: string) {
    const message = localErrors()[field] ?? "";
    setErrors((current) => ({ ...current, [field]: message }));
  }

  async function submit() {
    if (lock.current) return;
    if (advancedReason) {
      setErrors((current) => ({ ...current, endpoint: advancedReason }));
      return;
    }
    const invalid = localErrors();
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setGeneralError(invalid.form);
      return;
    }
    try {
      normalizeIntegrationSetupInput(input);
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "Review the integration details.");
      return;
    }
    lock.current = true;
    const run = (validationRun.current += 1);
    setBusy(true);
    setGeneralError(undefined);
    try {
      const preview = await scoped(() => previewIntegration(input));
      if (run !== validationRun.current) throw new Error("Setup changed while validation was running. Try again.");
      const result = await scoped(() => createIntegration(input, preview));
      setCreated(result);
      await showToast({ style: Toast.Style.Success, title: "Integration Added", message: result.name });
    } catch (error) {
      setGeneralError(error instanceof Error ? error.message : "Could not add this integration.");
      await showFailureToast(error, { title: "Could Not Add Integration" });
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function openAdvancedSetup() {
    try {
      const pathItem = {
        ...(/^https?:\/\//i.test(input.endpoint.trim()) ? { url: input.endpoint.trim() } : {}),
        slug: input.slug,
        auth: input.catalog?.auth,
        specOverrides: input.catalog?.specOverrides,
      };
      await open(await consoleUrl(integrationSetupPath(kind, pathItem)));
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Open Advanced Setup" });
    }
  }

  if (created) {
    return (
      <SetupStatus
        title={`${created.name} Added`}
        description="Add a connection to start using its tools."
        icon={providerIcon}
        actions={
          <ActionPanel>
            <Action.Push
              title="Add Connection"
              icon={Icon.Plug}
              target={<ConnectionSetupForm initialIntegration={created.slug} />}
            />
            <Action title="Done" icon={Icon.Check} onAction={pop} />
            <WorkspaceAction />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      navigationTitle={workspaceTitle(item ? `Add ${item.title}` : "Add Custom Integration")}
      isLoading={isLoading || busy}
      actions={
        <ActionPanel>
          {loadError ? (
            <Action
              title="Reload Setup"
              icon={Icon.RotateClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
          ) : (
            <Action.SubmitForm title="Add Integration" icon={providerIcon} onSubmit={submit} />
          )}
          {advancedReason ? (
            <Action title="Continue Advanced Setup in Executor" icon={Icon.Globe} onAction={openAdvancedSetup} />
          ) : null}
          <WorkspaceAction />
        </ActionPanel>
      }
    >
      {loadError ? (
        <Form.Description title="Setup Unavailable" text={loadError.message} />
      ) : (
        <>
          {item ? (
            <Form.Description title="Integration Type" text={KIND_LABEL[kind]} />
          ) : (
            <Form.Dropdown
              id="kind"
              title="Integration Type"
              value={kind}
              onChange={(value) => {
                setKind(value as CatalogKind);
                setCatalog(undefined);
                setAuthentication("detected");
                setErrors({});
                changed();
              }}
            >
              <Form.Dropdown.Item title="MCP Server" value="mcp" icon={INTEGRATION_KIND_ICON.mcp} />
              <Form.Dropdown.Item title="OpenAPI Specification" value="openapi" icon={INTEGRATION_KIND_ICON.openapi} />
              <Form.Dropdown.Item title="GraphQL Endpoint" value="graphql" icon={INTEGRATION_KIND_ICON.graphql} />
            </Form.Dropdown>
          )}
          {kind === "openapi" ? (
            <Form.TextArea
              id="endpoint"
              title="OpenAPI Spec"
              value={endpoint}
              placeholder="https://example.com/openapi.json or raw JSON/YAML"
              onChange={(value) => {
                setEndpoint(value);
                clearError("endpoint");
              }}
              onBlur={() => validateField("endpoint")}
              error={errors.endpoint}
              info="Use a public URL or paste raw JSON/YAML. Do not include credentials or secret query parameters."
            />
          ) : (
            <Form.TextField
              id="endpoint"
              title="Endpoint URL"
              value={endpoint}
              placeholder={`https://example.com/${kind}`}
              onChange={(value) => {
                setEndpoint(value);
                clearError("endpoint");
              }}
              onBlur={() => validateField("endpoint")}
              error={errors.endpoint}
              info="Use a public URL without credentials or secret query parameters."
            />
          )}
          <Form.TextField
            id="name"
            title="Display Name"
            value={name}
            placeholder={`Example ${KIND_LABEL[kind]}`}
            onChange={(value) => {
              setName(value);
              if (!slugEdited) setSlug(slugifyIntegrationName(value));
              clearError("name");
            }}
            onBlur={() => validateField("name")}
            error={errors.name}
          />
          <Form.TextField
            id="slug"
            title="Namespace"
            value={slug}
            placeholder="example_api"
            onChange={(value) => {
              setSlug(slugifyIntegrationName(value));
              setSlugEdited(true);
              clearError("slug");
            }}
            onBlur={() => validateField("slug")}
            error={errors.slug}
            info="Lowercase letters, numbers, and underscores. This becomes the integration identity."
          />
          <Form.TextArea
            id="description"
            title="Description"
            value={description}
            placeholder="What this integration provides"
            onChange={(value) => {
              setDescription(value);
              changed();
            }}
          />
          <Form.Dropdown
            id="authentication"
            title="Authentication"
            value={authentication}
            onChange={(value) => {
              setAuthentication(value);
              if (value === "header") {
                setAuthName("X-API-Key");
                setAuthPrefix("");
              } else if (value === "query") {
                setAuthName("api_key");
                setAuthPrefix("");
              }
              changed();
            }}
          >
            <Form.Dropdown.Item
              title={kind === "graphql" ? "No Method Declared" : "Use Detected Methods"}
              value="detected"
              icon={Icon.MagnifyingGlass}
            />
            <Form.Dropdown.Item title="None" value="none" icon={Icon.LockUnlocked} />
            <Form.Dropdown.Item title="Bearer Header" value="bearer" icon={Icon.Key} />
            <Form.Dropdown.Item title="API Key Header" value="header" icon={Icon.Key} />
            <Form.Dropdown.Item title="API Key Query Parameter" value="query" icon={Icon.Key} />
            {kind === "mcp" ? <Form.Dropdown.Item title="OAuth" value="oauth2" icon={Icon.Globe} /> : null}
          </Form.Dropdown>
          {authentication === "header" || authentication === "query" ? (
            <>
              <Form.TextField
                id="authName"
                title={authentication === "header" ? "Header Name" : "Query Parameter"}
                placeholder={authentication === "header" ? "X-API-Key" : "api_key"}
                value={authName}
                onChange={(value) => {
                  setAuthName(value);
                  clearError("authName");
                }}
                onBlur={() => validateField("authName")}
                error={errors.authName}
              />
              <Form.TextField
                id="authPrefix"
                title="Prefix"
                value={authPrefix}
                placeholder="Optional, for example Bearer "
                onChange={(value) => {
                  setAuthPrefix(value);
                  changed();
                }}
              />
            </>
          ) : null}
          {item?.auth?.note ? <Form.Description title="Authentication" text={item.auth.note} /> : null}
          {advancedReason ? <Form.Description title="Advanced Setup Required" text={advancedReason} /> : null}
          {generalError ? <Form.Description title="Setup Error" text={generalError} /> : null}
          <Form.Description text="Add this integration, then connect an account to use its tools." />
        </>
      )}
    </Form>
  );
}
