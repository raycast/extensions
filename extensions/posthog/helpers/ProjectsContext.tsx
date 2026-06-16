import { ReactNode, createContext, useContext, useEffect, useMemo } from "react";
import { fetchPostHogApi } from "./usePostHogClient";
import { Icon, LaunchType, List, Toast, launchCommand, showToast } from "@raycast/api";
import ErrorHandler from "../src/error-handler";
import { useCachedState, usePromise } from "@raycast/utils";
import {
  AccountProjectGroup,
  accountLabel,
  decodeProjectSelection,
  encodeProjectSelection,
  firstProjectSelectionValue,
  isProjectSelectionValueAvailable,
} from "./account-model";
import { ConnectAccountActions } from "./ConnectAccountActions";
import { AccountFailure, AuthenticatedPostHogAccount, getAuthenticatedAccounts } from "./posthog-auth";
import { useAutoConnectOnEmpty, useConnectAccount } from "./useConnectAccount";
import { firstRejectedError, toError } from "./promise-utils";

type SearchResult = {
  count: number;
  next: null;
  previous: null;
  results: Project[];
};

type Project = {
  id: number;
  name: string;
};

type ProjectGroup = AccountProjectGroup<Project> & {
  account: AuthenticatedPostHogAccount;
};

type ProjectsData = {
  groups: ProjectGroup[];
  failures: AccountFailure[];
};

type ProjectContextType = {
  projectGroups: ProjectGroup[];
  selectedAccount: AuthenticatedPostHogAccount | null;
  selectedId: string | null;
  selectedValue: string | null;
  setSelectedValue: (value: string) => void;
};

export const ProjectsContext = createContext<ProjectContextType>({
  projectGroups: [],
  selectedAccount: null,
  selectedId: null,
  selectedValue: null,
  setSelectedValue: () => null,
});

export function WithProjects({ children }: { children: ReactNode }) {
  const { data, isLoading, error, revalidate } = usePromise(loadProjectGroups);
  // Cached so the chosen account/project persists across command launches; the effect below
  // resets it whenever the stored selection is no longer available in the loaded data.
  const [selectedValue, setSelectedValue] = useCachedState<string | null>("posthog-selected-project", null);
  const connectAccount = useConnectAccount(revalidate);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (isProjectSelectionValueAvailable(data.groups, selectedValue)) {
      return;
    }

    setSelectedValue(firstProjectSelectionValue(data.groups));
  }, [data, selectedValue]);

  useEffect(() => {
    if (data && data.failures.length > 0) {
      void notifyAccountFailures(data.failures);
    }
  }, [data]);

  useAutoConnectOnEmpty(!isLoading && !!data, data?.groups.length === 0, connectAccount);

  const selection = selectedValue ? decodeProjectSelection(selectedValue) : null;
  const selectedGroup = selection ? data?.groups.find((group) => group.account.id === selection.accountId) : null;
  const selectedAccount =
    selectedGroup?.projects.some((project) => project.id.toString() === selection?.projectId) && selectedGroup.account
      ? selectedGroup.account
      : null;
  const selectedId = selectedAccount ? selection?.projectId ?? null : null;

  const value = useMemo(
    () => ({ projectGroups: data?.groups ?? [], selectedAccount, selectedId, selectedValue, setSelectedValue }),
    [data, selectedAccount, selectedId, selectedValue]
  );

  if (!data && isLoading) {
    return <List isLoading={true}></List>;
  }

  if (data?.groups.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="Connect a PostHog account"
          description="Use OAuth to connect one or more PostHog accounts."
          actions={<ConnectAccountActions onConnect={connectAccount} />}
        />
      </List>
    );
  }

  return (
    <ErrorHandler error={error}>
      <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
    </ErrorHandler>
  );
}

export function ProjectSelector() {
  const { projectGroups, selectedValue, setSelectedValue } = useContext(ProjectsContext);

  const handleChange = (value: string) => {
    setSelectedValue(value);
  };

  return (
    <List.Dropdown tooltip="Switch Account or Project" value={selectedValue ?? undefined} onChange={handleChange}>
      {projectGroups.map((group) => (
        <List.Dropdown.Section key={group.account.id} title={accountLabel(group.account)}>
          {group.projects.map((project) => (
            <List.Dropdown.Item
              key={`${group.account.id}:${project.id}`}
              title={project.name}
              value={encodeProjectSelection(group.account.id, project.id)}
            />
          ))}
        </List.Dropdown.Section>
      ))}
    </List.Dropdown>
  );
}

async function loadProjectGroups(): Promise<ProjectsData> {
  const { accounts, failures: authFailures } = await getAuthenticatedAccounts();
  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const data = await fetchPostHogApi<SearchResult>(account.baseUrl, account.accessToken, "projects");

      return { account, projects: data.results };
    })
  );

  const groups: ProjectGroup[] = [];
  const fetchFailures: AccountFailure[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      groups.push(result.value);
    } else {
      fetchFailures.push({ account: accounts[index], error: toError(result.reason) });
    }
  });

  if (accounts.length > 0 && groups.length === 0) {
    throw firstRejectedError(results, "Could not load projects for any connected PostHog accounts.");
  }

  return { groups, failures: [...authFailures, ...fetchFailures] };
}

async function notifyAccountFailures(failures: AccountFailure[]): Promise<void> {
  const [first, ...rest] = failures;

  await showToast({
    style: Toast.Style.Failure,
    title:
      failures.length === 1
        ? `Couldn't load ${accountLabel(first.account)}`
        : `${failures.length} accounts couldn't be loaded`,
    message: rest.length > 0 ? "Reconnect them from Manage Accounts." : first.error.message,
    primaryAction: {
      title: "Manage Accounts",
      onAction: () => {
        void launchCommand({ name: "accounts", type: LaunchType.UserInitiated });
      },
    },
  });
}
