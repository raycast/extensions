import { Action, ActionPanel, Detail, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCachedState, useFetch, useForm } from "@raycast/utils";
import { useToken } from "./instances";
import { ErrorResult, Server } from "./interfaces";

// Dokploy's public template registry - independent of any Dokploy instance/account, so this is
// fetched directly rather than through `useToken()`'s instance url/headers.
const TEMPLATES_BASE_URL = "https://templates.dokploy.com";

interface TemplateMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  logo: string;
  links: {
    github: string;
    website?: string;
    docs?: string;
  };
  tags: string[];
}

export default function Templates({ environmentId }: { environmentId: string }) {
  const {
    isLoading,
    data: templates,
    error,
    revalidate,
  } = useFetch<TemplateMetadata[], TemplateMetadata[]>(`${TEMPLATES_BASE_URL}/meta.json`, {
    initialData: [],
  });
  const [bookmarks, setBookmarks] = useCachedState<string[]>("template-bookmarks", []);

  function toggleBookmark(id: string) {
    setBookmarks((current) =>
      current.includes(id) ? current.filter((bookmarked) => bookmarked !== id) : [...current, id],
    );
  }

  const bookmarked = templates.filter((template) => bookmarks.includes(template.id));
  const rest = templates.filter((template) => !bookmarks.includes(template.id));

  function renderItem(template: TemplateMetadata) {
    const isBookmarked = bookmarks.includes(template.id);
    return (
      <List.Item
        key={template.id}
        icon={template.logo ? { source: `${TEMPLATES_BASE_URL}/blueprints/${template.id}/${template.logo}` } : Icon.Box}
        title={template.name}
        subtitle={template.description}
        keywords={template.tags}
        accessories={template.tags.slice(0, 2).map((tag) => ({ tag }))}
        actions={
          <ActionPanel>
            <Action.Push
              icon={Icon.Plus}
              title="Deploy"
              target={<TemplateDeployForm environmentId={environmentId} template={template} />}
            />
            <Action.Push
              icon={Icon.Eye}
              title="Preview"
              target={<TemplatePreview environmentId={environmentId} template={template} />}
            />
            <Action
              icon={isBookmarked ? Icon.StarDisabled : Icon.Star}
              title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
              onAction={() => toggleBookmark(template.id)}
            />
            {template.links.github && <Action.OpenInBrowser title="Open on GitHub" url={template.links.github} />}
            <Action icon={Icon.ArrowClockwise} title="Refresh" onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Templates" searchBarPlaceholder="Search templates…">
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Could Not Load Templates"
          description={`${error}`}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        <>
          {bookmarked.length > 0 && <List.Section title="Bookmarked">{bookmarked.map(renderItem)}</List.Section>}
          <List.Section title={bookmarked.length > 0 ? "All Templates" : undefined}>
            {rest.map(renderItem)}
          </List.Section>
        </>
      )}
    </List>
  );
}

function TemplateDeployForm({ environmentId, template }: { environmentId: string; template: TemplateMetadata }) {
  const { url, headers } = useToken();
  const { pop } = useNavigation();

  interface FormValues {
    serverId: string;
  }

  const {
    isLoading,
    data: servers,
    error: serversError,
    revalidate: retryServers,
  } = useFetch<Server[], Server[]>(url + "server.all", {
    headers,
    initialData: [],
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const toast = await showToast(Toast.Style.Animated, "Deploying", template.name);
      try {
        const response = await fetch(url + "compose.deployTemplate", {
          method: "POST",
          headers,
          // `deployTemplate`'s `serverId` is `z.string().optional()` - it rejects `null` outright
          // ("expected string, received null"), confirmed live. An empty/unset dropdown value from
          // `useForm` comes through as `null`, not `undefined`, so it must be converted here rather
          // than passed straight through - `undefined` is what `JSON.stringify` actually omits.
          body: JSON.stringify({ environmentId, id: template.id, serverId: values.serverId || undefined }),
        });
        if (!response.ok) {
          const err = (await response.json()) as ErrorResult;
          // `err.message` alone (e.g. "Input validation failed") doesn't say which field - the
          // Zod issue detail is what actually explains it.
          const detail = err.issues?.map((issue) => `${issue.path?.join(".") ?? "?"}: ${issue.message}`).join("; ");
          throw new Error(detail ? `${err.message} - ${detail}` : err.message);
        }
        toast.style = Toast.Style.Success;
        toast.title = "Deployed";
        toast.message = template.name;
        // Pops back to Services (two levels: this form, then the Templates list) rather than
        // popToRoot() - Services' own `onPop` (on the `Action.Push` that opened Templates) is what
        // actually revalidates the list, using its own live `revalidate` reference rather than one
        // threaded all the way down here, which would otherwise risk going stale across renders.
        pop();
        pop();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Could Not Deploy";
        toast.message = `${error}`;
      }
    },
  });

  return (
    <Form
      navigationTitle="Deploy Template"
      isLoading={isLoading}
      actions={
        <ActionPanel>
          {/* A failed server list must never silently fall through to deploying on whatever
           * server Dokploy defaults to - if the fetch failed, retrying it is the only action
           * offered until it succeeds. */}
          {serversError ? (
            <Action icon={Icon.ArrowClockwise} title="Retry Loading Servers" onAction={() => retryServers()} />
          ) : (
            <Action.SubmitForm icon={Icon.Plus} title="Deploy" onSubmit={handleSubmit} />
          )}
        </ActionPanel>
      }
    >
      <Form.Description title="Deploy" text={`Deploy ${template.name} to this environment.`} />
      {serversError ? (
        <Form.Description title="Server" text={`Could not load servers: ${serversError}`} />
      ) : (
        <Form.Dropdown
          title="Select a Server (Optional)"
          info="If no server is selected, the template will be deployed on the server where the user is logged in."
          {...itemProps.serverId}
        >
          {servers.map((server) => (
            <Form.Dropdown.Item key={server.id} title={server.name} value={server.id} />
          ))}
        </Form.Dropdown>
      )}
    </Form>
  );
}

interface TemplatePreviewResult {
  template: {
    domains: { serviceName: string; port: number; path?: string | null; host?: string | null }[];
    envs: string[];
    mounts: { filePath: string; content: string }[];
  };
}

/**
 * `compose.previewTemplate` doesn't fetch a template by id itself - unlike `deployTemplate`, it takes
 * the raw `docker-compose.yml`/`template.toml` text from the caller, base64-encoded together as
 * `{ compose, config }`. It then runs the exact same generator-token processing `deployTemplate` uses
 * server-side, so no TOML parsing is needed on this end either - just fetching and re-packaging the
 * same two files Deploy already knows how to find.
 */
function TemplatePreview({ environmentId, template }: { environmentId: string; template: TemplateMetadata }) {
  const { url, headers } = useToken();

  const {
    data: dockerCompose,
    isLoading: composeLoading,
    error: composeError,
    revalidate: retryCompose,
  } = useFetch<string, string>(`${TEMPLATES_BASE_URL}/blueprints/${template.id}/docker-compose.yml`, {
    initialData: "",
    async parseResponse(response) {
      if (!response.ok) throw new Error(`Could not load docker-compose.yml (status ${response.status})`);
      return response.text();
    },
  });

  const {
    data: templateToml,
    isLoading: tomlLoading,
    error: tomlError,
    revalidate: retryToml,
  } = useFetch<string, string>(`${TEMPLATES_BASE_URL}/blueprints/${template.id}/template.toml`, {
    initialData: "",
    async parseResponse(response) {
      if (!response.ok) throw new Error(`Could not load template.toml (status ${response.status})`);
      return response.text();
    },
  });

  const filesLoading = composeLoading || tomlLoading;
  const filesError = composeError ?? tomlError;
  const filesReady = !filesLoading && !filesError && Boolean(dockerCompose) && Boolean(templateToml);

  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
    revalidate: regeneratePreview,
  } = useFetch<TemplatePreviewResult, TemplatePreviewResult | undefined>(`${url}compose.previewTemplate`, {
    method: "POST",
    headers,
    // `appName` here only steers generator tokens like `${APP_NAME}`/domain generation for this
    // preview - the real deploy generates its own unique one server-side, so a stable placeholder
    // (the template id) is fine; it doesn't need to match what deployTemplate ends up using.
    body: JSON.stringify({
      base64: Buffer.from(JSON.stringify({ compose: dockerCompose, config: templateToml })).toString("base64"),
      appName: template.id,
    }),
    execute: filesReady,
    async parseResponse(response) {
      if (!response.ok) {
        const err = (await response.json()) as ErrorResult;
        throw new Error(err.message);
      }
      return (await response.json()) as TemplatePreviewResult;
    },
  });

  const isLoading = filesLoading || (filesReady && previewLoading);
  const error = filesError ?? previewError;

  // `regeneratePreview` alone would loop forever on a failed source-file fetch: it's gated on
  // `filesReady`, which a failed file fetch never becomes, so retrying only the preview call left
  // Retry stuck showing the same error. If a file failed, retry both file fetches instead (doesn't
  // matter which one specifically failed) and let `execute: filesReady` fire the preview call once
  // they succeed - calling `regeneratePreview` immediately here would just reuse the still-stale
  // (pre-retry) file contents captured in this render, not the ones on the way.
  function retry() {
    if (filesError) {
      retryCompose();
      retryToml();
    } else {
      regeneratePreview();
    }
  }

  // Metadata.Label's own `icon` renders at a small, fixed size Raycast doesn't expose any control
  // over (confirmed live - it came out barely bigger than a favicon) - too small to read as an
  // actual logo. Markdown's `raycast-width` is the only place logo size is actually controllable,
  // so it lives there instead, just at a modest width rather than the earlier 160 (too dominant).
  const header = template.logo
    ? `![${template.name}](${TEMPLATES_BASE_URL}/blueprints/${template.id}/${template.logo}?raycast-width=64)\n\n`
    : "";
  const body = error
    ? `**Could not load preview.**\n\n${error}`
    : preview
      ? formatPreview(preview)
      : "Loading preview…";
  const markdown = `${header}# ${template.name}\n\n${template.description}\n\n---\n\n${body}`;

  return (
    <Detail
      navigationTitle={`${template.name} Preview`}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Version" text={template.version} />
          <Detail.Metadata.TagList title="Tags">
            {template.tags.map((tag) => (
              <Detail.Metadata.TagList.Item key={tag} text={tag} />
            ))}
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="GitHub" target={template.links.github} text="Open" />
          {template.links.website && (
            <Detail.Metadata.Link title="Website" target={template.links.website} text="Open" />
          )}
          {template.links.docs && <Detail.Metadata.Link title="Docs" target={template.links.docs} text="Open" />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            icon={Icon.Plus}
            title="Deploy"
            target={<TemplateDeployForm environmentId={environmentId} template={template} />}
          />
          {error ? (
            <Action icon={Icon.ArrowClockwise} title="Retry" onAction={retry} />
          ) : (
            <Action icon={Icon.ArrowClockwise} title="Regenerate Preview" onAction={retry} />
          )}
          <Action.OpenInBrowser title="Open on GitHub" url={template.links.github} />
        </ActionPanel>
      }
    />
  );
}

function formatPreview({ template: processed }: TemplatePreviewResult): string {
  const sections: string[] = [];

  if (processed.domains.length > 0) {
    sections.push(
      "## Domains\n" +
        processed.domains
          .map((domain) => {
            const path = domain.path && domain.path !== "/" ? domain.path : "";
            return `- **${domain.serviceName}** → \`${domain.host ?? "(no host)"}${path}\` (port ${domain.port})`;
          })
          .join("\n"),
    );
  }

  if (processed.envs.length > 0) {
    sections.push("## Environment Variables\n```\n" + processed.envs.join("\n") + "\n```");
  }

  if (processed.mounts.length > 0) {
    sections.push(
      "## Mounts\n" +
        processed.mounts
          .map((mount) => `### \`${mount.filePath}\`\n\`\`\`\n${mount.content.replace(/```/g, "\\`\\`\\`")}\n\`\`\``)
          .join("\n\n"),
    );
  }

  if (sections.length === 0) {
    sections.push("_This template doesn't define any domains, environment variables, or file mounts._");
  }

  return (
    "_Generated values below (passwords, domains) are a random sample - deploying generates fresh ones, not these exact values._\n\n" +
    sections.join("\n\n")
  );
}
