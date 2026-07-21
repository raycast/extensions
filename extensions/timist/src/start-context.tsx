import { Action, ActionPanel, Color, Form, Icon, List, showHUD, showToast, Toast } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { ApiError, createContext, getContexts, stopContext } from "./api/client";
import type { Context, CreateContextInput } from "./api/types";
import { ProjectTagFields } from "./components/ProjectTagFields";
import { useProjects, useTags } from "./hooks";
import { ensureCacheOwner } from "./lib/cache";
import { showApiErrorToast, UPGRADE_URL, withRateLimitRetry } from "./lib/errors";
import { formatDuration, formatRelative } from "./lib/format";
import { ProjectTagFormValues, projectTagParams } from "./lib/form";
import { refreshMenuBar } from "./lib/refresh";

function isUpgradeRequired(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 403;
}

// Two contexts with the same project + tag set are "essentially" the same
// recurring combination — only surface the most recent one.
function contextSignature(context: Context): string {
  const tagIds = context.tags
    .map((tag) => tag.id)
    .sort()
    .join(",");
  return `${context.project?.id ?? ""}|${tagIds}`;
}

function dedupeBySignature(contexts: Context[]): Context[] {
  const seen = new Set<string>();
  return contexts.filter((context) => {
    const signature = contextSignature(context);
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}

async function startContext(input: CreateContextInput) {
  const created = await withRateLimitRetry(() => createContext(input));
  await showHUD(`◉ ${created.display_label}`);
  await refreshMenuBar();
}

function CreateContextForm() {
  const projects = useProjects();
  const tags = useTags();
  const [projectValue, setProjectValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(values: ProjectTagFormValues) {
    setIsSubmitting(true);
    try {
      await startContext(projectTagParams(values));
    } catch (error) {
      await showApiErrorToast(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={projects.isLoading || tags.isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Context"
            icon={Icon.Play}
            onSubmit={(values: ProjectTagFormValues) => void onSubmit(values)}
          />
        </ActionPanel>
      }
    >
      <ProjectTagFields
        projects={projects.data ?? []}
        tags={tags.data ?? []}
        projectValue={projectValue}
        onProjectChange={setProjectValue}
      />
    </Form>
  );
}

export default function StartContext() {
  ensureCacheOwner();
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => setQuery(searchText.trim()), 250);
    return () => clearTimeout(handle);
  }, [searchText]);

  // Recent (empty-query) list is cached for instant paint; typed searches
  // always hit the network and are never persisted.
  const recent = useCachedPromise(getContexts, [], {
    keepPreviousData: true,
    onError: (error) => {
      if (isUpgradeRequired(error)) return; // rendered as the full-view upgrade screen
      void showApiErrorToast(error);
    },
  });
  const search = usePromise((q: string) => getContexts(q), [query], {
    execute: query.length > 0,
    onError: (error) => {
      if (isUpgradeRequired(error)) return;
      void showApiErrorToast(error);
    },
  });

  if (isUpgradeRequired(recent.error)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Lock}
          title="Contexts require Timist Plus"
          description={recent.error.message}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Upgrade" url={UPGRADE_URL} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const items = (query ? search.data : recent.data) ?? [];
  const running = items.filter((context) => context.running);
  const rest = dedupeBySignature(items.filter((context) => !context.running));

  async function onStart(context: Context) {
    try {
      // Re-starting a past combination = a new context with the same
      // associations, matching the web app's recent-context buttons.
      await startContext({ project_id: context.project?.id, tag_ids: context.tags.map((tag) => tag.id) });
      void recent.mutate();
    } catch (error) {
      await showApiErrorToast(error, { refetch: () => recent.mutate() });
    }
  }

  async function onStop(context: Context) {
    try {
      const stopped = await withRateLimitRetry(() => stopContext(context.id));
      await showToast({
        style: Toast.Style.Success,
        title: `◌ ${stopped.display_label} · ${formatDuration(stopped.completed_duration_seconds)}`,
      });
      await recent.mutate();
      await refreshMenuBar();
    } catch (error) {
      await showApiErrorToast(error, { refetch: () => recent.mutate() });
    }
  }

  const createAction = <Action.Push title="Create New Context" icon={Icon.Plus} target={<CreateContextForm />} />;

  return (
    <List
      isLoading={recent.isLoading || (query.length > 0 && search.isLoading)}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search contexts…"
    >
      <List.EmptyView
        icon={Icon.CircleFilled}
        title={query ? "No matching contexts" : "No contexts yet"}
        actions={<ActionPanel>{createAction}</ActionPanel>}
      />
      {running.length > 0 && (
        <List.Section title="Running">
          {running.map((context) => (
            <List.Item
              key={context.id}
              icon={{ source: Icon.CircleFilled, tintColor: Color.Green }}
              title={context.display_label}
              accessories={[{ tag: { value: "Running", color: Color.Green } }]}
              actions={
                <ActionPanel>
                  <Action title="Stop Context" icon={Icon.Stop} onAction={() => void onStop(context)} />
                  {createAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {rest.length > 0 && (
        <List.Section title="Recent">
          {rest.map((context) => (
            <List.Item
              key={context.id}
              icon={Icon.Circle}
              title={context.display_label}
              accessories={[{ text: formatRelative(context.started_at) }]}
              actions={
                <ActionPanel>
                  <Action title="Start Context" icon={Icon.Play} onAction={() => void onStart(context)} />
                  {createAction}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
