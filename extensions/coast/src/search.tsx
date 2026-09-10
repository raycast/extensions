import {
  Icon,
  Action,
  ActionPanel,
  List,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { SaveSearchForm } from "./saved-searches";
import { GalleryFilters } from "./gallery";
import { useCallback, useEffect, useRef, useState } from "react";
import { readableTime } from "./dates";
import { captureSubtitle } from "./moments";
import { useAppIcons } from "./app-icons";
import { CaptureActions, CaptureDetailPane } from "./capture";
import {
  listApplications,
  type ApplicationIdentifier,
  type CaptureDetail,
  type Preferences,
} from "./coast";
import { loadSearchResults } from "./search-data";

type State = {
  key?: string;
  results: CaptureDetail[];
  isLoading: boolean;
  error?: string;
  hasMore?: boolean;
  tr?: string;
};

export default function Command() {
  const appIcon = useAppIcons();
  const preferences = getPreferenceValues<Preferences>();
  const request = useRef(0);
  const loading = useRef(false);
  const configuredSize = Number(preferences.defaultLimit);
  const pageSize =
    Number.isSafeInteger(configuredSize) && configuredSize > 0
      ? Math.min(configuredSize, 200)
      : 20;
  const [searchText, setSearchText] = useState("");
  const [application, setApplication] = useState("");
  const [domain, setDomain] = useState("");
  const [applications, setApplications] = useState<ApplicationIdentifier[]>([]);
  const [state, setState] = useState<State>({
    results: [],
    isLoading: false,
  });

  useEffect(() => {
    listApplications()
      .then(setApplications)
      .catch(() => setApplications([]));
  }, []);

  const search = useCallback(
    async (query: string, visible = pageSize, tr?: string) => {
      const id = ++request.current;
      loading.current = true;
      const key = JSON.stringify([query, application, domain]);
      if (!query.trim()) {
        loading.current = false;
        setState({ key, results: [], isLoading: false });
        return;
      }
      setState((previous) => ({
        ...(tr && previous.key === key ? previous : {}),
        key,
        results: tr && previous.key === key ? previous.results : [],
        isLoading: true,
        error: undefined,
      }));
      try {
        const result = await loadSearchResults(
          {
            query,
            tr,
            appFilters: application ? [application] : undefined,
            domainFilters: domain ? [domain] : undefined,
          },
          visible,
        );
        if (id === request.current)
          setState({
            key,
            results: result.results,
            tr: result.scope.tr,
            hasMore: result.hasMore,
            isLoading: false,
          });
      } catch (error) {
        if (id !== request.current) return;
        const message = error instanceof Error ? error.message : String(error);
        setState((previous) => ({
          ...previous,
          key,
          isLoading: false,
          error: message,
        }));
        showToast({
          style: Toast.Style.Failure,
          title: "Search Failed",
          message,
        });
      } finally {
        if (id === request.current) loading.current = false;
      }
    },
    [application, domain, pageSize],
  );

  useEffect(() => {
    const timeout = setTimeout(() => search(searchText), 300);
    return () => {
      clearTimeout(timeout);
      request.current++;
    };
  }, [searchText, search]);
  const pending =
    state.key !== JSON.stringify([searchText, application, domain]);
  const results = pending ? [] : state.results;
  const error = pending ? undefined : state.error;
  const isLoading = pending ? Boolean(searchText.trim()) : state.isLoading;
  const loadMore = () => {
    if (pending || loading.current) return;
    void search(
      searchText,
      Math.max(pageSize, results.length + pageSize),
      state.tr,
    );
  };
  const loadMoreAction =
    state.hasMore || error ? (
      <Action
        title={error ? "Retry Loading Results" : "Load More Results"}
        icon={Icon.ArrowDown}
        onAction={loadMore}
      />
    ) : null;

  const applicationDropdown = (
    <List.Dropdown
      tooltip="Application"
      value={application}
      onChange={setApplication}
      storeValue
    >
      <List.Dropdown.Item title="All Applications" value="" />
      {applications.map((item) => (
        <List.Dropdown.Item
          key={item.bundle_id}
          title={item.display_name || item.bundle_id}
          value={item.bundle_id}
        />
      ))}
    </List.Dropdown>
  );
  const filterAction = (
    <Action.Push
      title="Filter Application and Domain…"
      icon={Icon.Filter}
      target={
        <GalleryFilters
          initial={{ app: application, domain }}
          onApply={(app, site) => {
            setApplication(app);
            setDomain(site);
          }}
        />
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      navigationTitle={domain ? `Search Coast · ${domain}` : "Search Coast"}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarAccessory={applicationDropdown}
      searchBarPlaceholder="Search OCR text and titles..."
      throttle
      pagination={{
        pageSize,
        hasMore: !pending && !error && Boolean(state.hasMore),
        onLoadMore: loadMore,
      }}
    >
      {!searchText && (
        <List.EmptyView
          title="Find a Past Moment"
          description="Search for words you remember, or use quotes for an exact phrase. Choose an application to narrow the search."
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              {filterAction}
              <Action.Push
                title="Save Search…"
                target={
                  <SaveSearchForm
                    initial={{ query: searchText, app: application, domain }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      )}
      {error && results.length === 0 ? (
        <List.EmptyView
          title="Search failed"
          description={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              {loadMoreAction}
              {filterAction}
            </ActionPanel>
          }
        />
      ) : null}
      {!error && searchText && results.length === 0 && !isLoading ? (
        <List.EmptyView
          title="No results"
          description={`No captures matching "${searchText}"`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              {filterAction}
              <Action.Push
                title="Save Search…"
                target={
                  <SaveSearchForm
                    initial={{ query: searchText, app: application, domain }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section
        title={
          results.length
            ? `${results.length} matches loaded${state.hasMore ? " · More available" : " · End of matching results"}`
            : undefined
        }
      >
        {results.map((capture) => (
          <List.Item
            key={capture.frame_id}
            icon={appIcon(capture.application)}
            title={capture.title || capture.application}
            subtitle={captureSubtitle(capture)}
            accessories={[{ text: readableTime(capture.timestamp) }]}
            detail={
              <CaptureDetailPane key={capture.frame_id} capture={capture} />
            }
            actions={
              <CaptureActions
                capture={capture}
                frames={results}
                scope={{
                  tr: state.tr,
                  appFilters: application ? [application] : undefined,
                  domainFilters: domain ? [domain] : undefined,
                }}
              >
                {loadMoreAction}
                {filterAction}
                <Action.Push
                  title="Save Search…"
                  icon={Icon.Bookmark}
                  target={
                    <SaveSearchForm
                      initial={{ query: searchText, app: application, domain }}
                    />
                  }
                />
              </CaptureActions>
            }
          />
        ))}
      </List.Section>
      {error && results.length > 0 ? (
        <List.Item
          title="Could Not Load More Results"
          subtitle={error}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              {loadMoreAction}
              {filterAction}
            </ActionPanel>
          }
        />
      ) : null}
    </List>
  );
}
