import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  confirmAlert,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { randomUUID } from "node:crypto";
import { useCallback, useEffect, useRef, useState } from "react";
import { listApplications, listDomains, type CaptureDetail } from "./coast";
import { CaptureActions } from "./capture";
import { readableTime } from "./dates";
import { captureSubtitle } from "./moments";
import {
  listSavedSearches,
  removeSearch,
  runSavedSearch,
  saveSearch,
  type SavedSearch,
} from "./saved";
import { useLoad } from "./use-load";

export function SaveSearchForm({
  initial,
  onSaved,
}: {
  initial?: Partial<SavedSearch>;
  onSaved?: () => void;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  const load = useCallback(
    async () => ({
      apps: await listApplications(),
      domains: await listDomains(),
    }),
    [],
  );
  const filters = useLoad(load);
  return (
    <Form
      isLoading={filters.isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Search"
            onSubmit={async (values: Omit<SavedSearch, "id">) => {
              try {
                await saveSearch({
                  ...values,
                  id: initial?.id || randomUUID(),
                });
                onSaved?.();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Search saved",
                });
                pop();
              } catch (reason) {
                setError(
                  reason instanceof Error ? reason.message : String(reason),
                );
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          error ||
          filters.error ||
          "Only the name, query and filters are saved locally. Screenshots and OCR are never copied into saved searches. An empty query browses representative activity."
        }
      />
      <Form.TextField
        id="name"
        title="Name"
        defaultValue={initial?.name}
        placeholder="Research this week"
      />
      <Form.TextField
        id="query"
        title="Search Query"
        defaultValue={initial?.query}
        placeholder="Optional words or FTS phrase"
      />
      <Form.Dropdown
        id="app"
        title="Application"
        defaultValue={initial?.app || ""}
      >
        <Form.Dropdown.Item value="" title="All Applications" />
        {filters.data?.apps.map((app) => (
          <Form.Dropdown.Item
            key={app.bundle_id}
            value={app.bundle_id}
            title={app.display_name || app.bundle_id}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="domain"
        title="Domain"
        defaultValue={initial?.domain || ""}
      >
        <Form.Dropdown.Item value="" title="All Domains" />
        {filters.data?.domains.map((domain) => (
          <Form.Dropdown.Item key={domain} value={domain} title={domain} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="days"
        title="Rolling Range"
        defaultValue={initial?.days || "7"}
      >
        <Form.Dropdown.Item title="Today" value="1" />
        <Form.Dropdown.Item title="Last 7 Days" value="7" />
        <Form.Dropdown.Item title="Last 30 Days" value="30" />
      </Form.Dropdown>
    </Form>
  );
}

type SavedResult = Awaited<ReturnType<typeof runSavedSearch>>;

type SavedResultState = {
  frames: CaptureDetail[];
  result?: Omit<SavedResult, "frames">;
  isLoading: boolean;
  error?: string;
};

const savedPageSize = 50;
const automaticPagingLimit = 1_000;

function SavedResults({ search }: { search: SavedSearch }) {
  const request = useRef(0);
  const resolvedRange = useRef<string | undefined>(undefined);
  const [state, setState] = useState<SavedResultState>({
    frames: [],
    isLoading: true,
  });
  const load = useCallback(
    async (offset = 0, reset = false) => {
      const id = ++request.current;
      setState((previous) => ({
        ...previous,
        frames: reset ? [] : previous.frames,
        result: reset ? undefined : previous.result,
        isLoading: true,
        error: undefined,
      }));
      try {
        const page = await runSavedSearch(search, {
          offset,
          limit: savedPageSize,
          tr: reset ? undefined : resolvedRange.current,
        });
        if (id !== request.current) return;
        resolvedRange.current = page.scope.tr;
        setState((previous) => {
          const frames = reset
            ? page.frames
            : [...previous.frames, ...page.frames].filter(
                (frame, index, all) =>
                  all.findIndex((item) => item.frame_id === frame.frame_id) ===
                  index,
              );
          return {
            frames,
            result: {
              scope: page.scope,
              pagination: page.pagination,
              coverage: page.coverage,
            },
            isLoading: false,
          };
        });
      } catch (reason) {
        if (id !== request.current) return;
        setState((previous) => ({
          ...previous,
          isLoading: false,
          error: reason instanceof Error ? reason.message : String(reason),
        }));
      }
    },
    [search],
  );

  useEffect(() => {
    void load(0, true);
    return () => {
      request.current++;
    };
  }, [load]);

  const loadMore = useCallback(() => {
    const offset = state.result?.pagination.next_offset;
    if (offset !== null && offset !== undefined) void load(offset);
  }, [load, state.result?.pagination.next_offset]);
  const hasMore = state.result?.pagination.has_more ?? false;
  const autoHasMore =
    hasMore &&
    !state.isLoading &&
    !state.error &&
    state.frames.length < automaticPagingLimit;

  return (
    <List
      navigationTitle={search.name}
      isLoading={state.isLoading}
      searchBarPlaceholder="Filter moments…"
      pagination={{
        pageSize: savedPageSize,
        hasMore: autoHasMore,
        onLoadMore: loadMore,
      }}
    >
      <List.EmptyView
        title={state.error || "No Recorded Moments"}
        description={
          state.error ||
          (state.isLoading ? "Running saved search…" : "Try different filters.")
        }
        actions={
          <ActionPanel>
            {hasMore ? (
              <Action title="Load More Results" onAction={loadMore} />
            ) : null}
            <Action title="Retry" onAction={() => load(0, true)} />
          </ActionPanel>
        }
      />
      <List.Section
        title={`${state.frames.length} selected captures`}
        subtitle={hasMore ? "More available" : undefined}
      >
        {state.frames.map((capture) => (
          <List.Item
            key={capture.frame_id}
            title={capture.title || capture.application}
            subtitle={captureSubtitle(capture)}
            accessories={[{ text: readableTime(capture.timestamp) }]}
            actions={
              <CaptureActions
                capture={capture}
                frames={state.frames}
                scope={
                  state.result
                    ? {
                        tr: state.result.scope.tr,
                        appFilters: state.result.scope.appFilters,
                        domainFilters: state.result.scope.domainFilters,
                      }
                    : undefined
                }
              />
            }
          />
        ))}
        {state.error && state.frames.length > 0 ? (
          <List.Item
            title="Could Not Load More"
            subtitle={state.error}
            icon={Icon.ExclamationMark}
            actions={
              <ActionPanel>
                <Action title="Retry Loading More" onAction={loadMore} />
              </ActionPanel>
            }
          />
        ) : null}
        {hasMore && !state.isLoading ? (
          <List.Item
            title="Load More"
            subtitle={
              state.frames.length >= automaticPagingLimit
                ? "Automatic paging paused for safety"
                : `${state.frames.length} currently loaded`
            }
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action title="Load More" onAction={loadMore} />
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
    </List>
  );
}

export default function Command() {
  const state = useLoad(listSavedSearches);
  const add = (
    <Action.Push
      title="New Saved Search…"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<SaveSearchForm onSaved={state.retry} />}
    />
  );
  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Find a saved search…"
    >
      <List.EmptyView
        title={state.error || "Your Shortcuts to Past Moments"}
        description="Save a query, application or domain with a rolling date range."
        actions={
          <ActionPanel>
            {add}
            <Action title="Retry" onAction={state.retry} />
          </ActionPanel>
        }
      />
      {state.data?.map((search) => (
        <List.Item
          key={search.id}
          title={search.name}
          subtitle={search.query || "Activity highlights"}
          accessories={[
            { text: search.days === "1" ? "Today" : `${search.days} days` },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Run Saved Search"
                target={<SavedResults search={search} />}
              />
              <Action.Push
                title="Edit Saved Search…"
                target={
                  <SaveSearchForm initial={search} onSaved={state.retry} />
                }
              />
              {add}
              <Action
                title="Delete Saved Search"
                style={Action.Style.Destructive}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Delete “${search.name}”?`,
                      message:
                        "Only this saved filter will be removed. Coast recordings are unchanged.",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    await removeSearch(search.id);
                    state.retry();
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
