import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
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

  const { isLoading, data: servers } = useFetch<Server[], Server[]>(url + "server.all", {
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
          <Action.SubmitForm icon={Icon.Plus} title="Deploy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description title="Deploy" text={`Deploy ${template.name} to this environment.`} />
      <Form.Dropdown
        title="Select a Server (Optional)"
        info="If no server is selected, the template will be deployed on the server where the user is logged in."
        {...itemProps.serverId}
      >
        {servers.map((server) => (
          <Form.Dropdown.Item key={server.id} title={server.name} value={server.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
