import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { fetchPostHogApi } from "./usePostHogClient";
import { Icon, List, Toast, showToast } from "@raycast/api";
import ErrorHandler from "../src/error-handler";
import { usePromise } from "@raycast/utils";
import {
  AccountProjectGroup,
  accountLabel,
  decodeProjectSelection,
  encodeProjectSelection,
  firstProjectSelectionValue,
  isProjectSelectionValueAvailable,
  PostHogRegion,
} from "./account-model";
import { ConnectAccountActions } from "./ConnectAccountActions";
import {
  AuthenticatedPostHogAccount,
  POSTHOG_REGIONS,
  connectPostHogAccount,
  getAuthenticatedAccounts,
} from "./posthog-auth";

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
  const [selectedValue, setSelectedValue] = useState<string | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    if (isProjectSelectionValueAvailable(data, selectedValue)) {
      return;
    }

    setSelectedValue(firstProjectSelectionValue(data));
  }, [data, selectedValue]);

  const connectAccount = async (region: PostHogRegion) => {
    await showToast({ style: Toast.Style.Animated, title: `Connecting PostHog ${POSTHOG_REGIONS[region].title}` });

    try {
      const account = await connectPostHogAccount(region);
      await showToast({
        style: Toast.Style.Success,
        title: "Connected PostHog account",
        message: account.email ?? POSTHOG_REGIONS[region].title,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not connect PostHog account",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const selection = selectedValue ? decodeProjectSelection(selectedValue) : null;
  const selectedGroup = selection ? data?.find((group) => group.account.id === selection.accountId) : null;
  const selectedAccount =
    selectedGroup?.projects.some((project) => project.id.toString() === selection?.projectId) && selectedGroup.account
      ? selectedGroup.account
      : null;
  const selectedId = selectedAccount ? selection?.projectId ?? null : null;

  if (!data && isLoading) {
    return <List isLoading={true}></List>;
  }

  if (data?.length === 0) {
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
      <ProjectsContext.Provider
        value={{
          projectGroups: data ?? [],
          selectedAccount,
          selectedId,
          selectedValue,
          setSelectedValue,
        }}
      >
        {children}
      </ProjectsContext.Provider>
    </ErrorHandler>
  );
}

export function ProjectSelector() {
  const { projectGroups, selectedValue, setSelectedValue } = useContext(ProjectsContext);

  const handleChange = (value: string) => {
    setSelectedValue(value);
  };

  return (
    <List.Dropdown tooltip="Switch Project" value={selectedValue ?? undefined} onChange={handleChange} storeValue>
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

async function loadProjectGroups(): Promise<ProjectGroup[]> {
  const accounts = await getAuthenticatedAccounts();
  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const data = await fetchPostHogApi<SearchResult>(account.baseUrl, account.accessToken, "projects");

      return { account, projects: data.results };
    })
  );

  return results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}
