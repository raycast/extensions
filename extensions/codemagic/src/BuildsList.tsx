import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Image,
  Color,
  Alert,
  confirmAlert,
  Cache,
} from "@raycast/api";
import { useState, useEffect, useRef, useCallback } from "react";
import { AbortError } from "node-fetch";
import { fetchBuilds, cancelBuild, rerunBuild } from "./network";
import { Application, Build, BuildStatus } from "./types";
import { filterBuilds, sortBuilds } from "./util";

interface SearchState {
  searchText: string;
  searchBuildStatus?: BuildStatus;
  isLoading: boolean;
  builds: Build[];
}

const isBuildCancellable = (build: Build): boolean => {
  switch (build.status) {
    case BuildStatus.queued:
    case BuildStatus.preparing:
    case BuildStatus.fetching:
    case BuildStatus.building:
    case BuildStatus.testing:
    case BuildStatus.publishing:
      return true;
    case BuildStatus.skipped:
    case BuildStatus.canceled:
    case BuildStatus.timeout:
    case BuildStatus.failed:
    case BuildStatus.warning:
    case BuildStatus.finishing:
    case BuildStatus.finished:
      return false;
  }
};
const getBuildURL = (build: Build) => `https://codemagic.io/app/${build.appId}/build/${build._id}`;
const iconForStatus = (status: BuildStatus): { value: Image.ImageLike; tooltip: string } => {
  const tooltip = status.toString();

  let value: { source: Icon; tintColor?: Color };
  switch (status) {
    case BuildStatus.queued:
      value = { source: Icon.Clock, tintColor: Color.SecondaryText };
      break;
    case BuildStatus.preparing:
    case BuildStatus.fetching:
      value = { source: Icon.Gear, tintColor: Color.Orange };
      break;
    case BuildStatus.building:
      value = { source: Icon.Hammer, tintColor: Color.Orange };
      break;
    case BuildStatus.testing:
      value = { source: Icon.MagnifyingGlass, tintColor: Color.Orange };
      break;
    case BuildStatus.publishing:
      value = { source: Icon.Upload, tintColor: Color.Orange };
      break;
    case BuildStatus.skipped:
      value = { source: Icon.Forward, tintColor: Color.SecondaryText };
      break;
    case BuildStatus.canceled:
      value = { source: Icon.XMarkCircle, tintColor: Color.SecondaryText };
      break;
    case BuildStatus.timeout:
      value = { source: Icon.Clock, tintColor: Color.Red };
      break;
    case BuildStatus.failed:
      value = { source: Icon.XMarkCircle, tintColor: Color.Red };
      break;
    case BuildStatus.warning:
      value = { source: Icon.ExclamationMark, tintColor: Color.Orange };
      break;
    case BuildStatus.finishing:
      value = { source: Icon.Checkmark, tintColor: Color.Orange };
      break;
    case BuildStatus.finished:
      value = { source: Icon.Checkmark, tintColor: Color.Green };
      break;
    default:
      console.warn("Unknown status:", status);
      value = { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
      break;
  }

  return { value, tooltip };
};

const confirmCancelBuild = async (build: Build) => {
  const options: Alert.Options = {
    title: "Are you sure?",
    message: `Build with ID ${build._id} (branch: ${build.branch}) will be cancelled.`,
    primaryAction: {
      title: "Cancel build",
      style: Alert.ActionStyle.Destructive,
      onAction: () => cancelBuild(build),
    },
    dismissAction: {
      title: "Nevermind",
    },
  };
  await confirmAlert(options);
};

const Search = (appId: string) => {
  const cache = new Cache();

  const cacheKey = `builds.${appId}`;
  const cachedBuilds = JSON.parse(cache.get(cacheKey) ?? JSON.stringify([]));

  const [state, setState] = useState<SearchState>({ searchText: "", isLoading: true, builds: cachedBuilds });
  const cancelRef = useRef<AbortController | null>(null);

  const search = useCallback(
    async function search(searchText: string, buildStatus?: BuildStatus) {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
        searchText,
        searchBuildStatus: buildStatus,
      }));

      try {
        const builds = await fetchBuilds(appId, cancelRef.current.signal);
        const sortedBuilds = sortBuilds(builds);
        cache.set(cacheKey, JSON.stringify(sortedBuilds));

        setState((oldState) => ({
          ...oldState,
          builds: sortedBuilds,
          isLoading: false,
          alreadyFetched: true,
        }));
      } catch (error) {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));

        if (error instanceof AbortError) {
          return;
        }

        console.error("search error", error);
        showToast({ style: Toast.Style.Failure, title: "Could not perform search", message: String(error) });
      }
    },
    [cancelRef, setState]
  );

  useEffect(() => {
    search("");
    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  return {
    state: state,
    search: search,
  };
};

const BuildListItem = ({ build }: { build: Build }) => {
  const buildDate = build.startedAt ? new Date(Date.parse(build.startedAt)) : undefined;
  return (
    <List.Item
      title={build.branch}
      accessories={[{ text: build.fileWorkflowId }, { text: buildDate?.toLocaleString() }]}
      icon={iconForStatus(build.status)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser url={getBuildURL(build)} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {isBuildCancellable(build) && (
              <Action.SubmitForm
                title="Cancel build"
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                onSubmit={() => confirmCancelBuild(build)}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
              />
            )}
            <Action.SubmitForm
              title="Re-run build"
              icon={Icon.ArrowClockwise}
              onSubmit={() => rerunBuild(build)}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

const BuildStatusDropdown = ({ onValueChange }: { onValueChange: (val?: BuildStatus) => void }) => (
  <List.Dropdown
    tooltip="Status"
    // disabled={isLoading}
    storeValue={true}
    onChange={(val) => onValueChange(val as BuildStatus)}
  >
    <List.Dropdown.Section>
      <List.Dropdown.Item key={"all"} title={"All"} value={""} />
    </List.Dropdown.Section>
    <List.Dropdown.Section title="Statuses">
      {Object.keys(BuildStatus).map((status) => (
        <List.Dropdown.Item
          key={status}
          title={status.slice(0, 1).toUpperCase() + status.slice(1)}
          value={status}
          icon={iconForStatus(status as BuildStatus).value}
        />
      ))}
    </List.Dropdown.Section>
  </List.Dropdown>
);

const ApplicationBuildsList = ({ application }: { application: Application }) => {
  const { state, search } = Search(application._id);
  const buildStatusFixed = state.searchBuildStatus?.toString().length == 0 ? undefined : state.searchBuildStatus;
  const builds = filterBuilds(state.builds, state.searchText, buildStatusFixed);

  return (
    <List
      isLoading={state.isLoading}
      onSearchTextChange={(text) => search(text, state.searchBuildStatus)}
      searchText={state.searchText}
      searchBarPlaceholder={`Search builds of ${application.appName}...`}
      searchBarAccessory={<BuildStatusDropdown onValueChange={(value) => search(state.searchText, value)} />}
      throttle
    >
      <List.Section title="Builds" subtitle={builds.length.toString()}>
        {builds.map((build) => (
          <BuildListItem key={build._id} build={build} />
        ))}
      </List.Section>
    </List>
  );
};

export default ApplicationBuildsList;
