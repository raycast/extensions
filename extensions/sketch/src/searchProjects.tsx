import {
  ActionPanel,
  Icon,
  List,
  showToast,
  ToastStyle,
  getPreferenceValues,
  setLocalStorageItem,
  KeyEquivalent,
  clearLocalStorage,
  useNavigation,
  CopyToClipboardAction,
  OpenInBrowserAction,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Project } from "./types/SketchWorkspaceShare";
import { getProjects, getWorkspaces, login } from "./utils/functions";
import { Preferences, SelectedWorkspace, StoredCachedProjctes } from "./types/preferences";
import { getAllWorkspaces, getCachedProjects, getLastUsedEmail, getSelectedWorkspace } from "./utils/storage";

import { Me } from "./types/SketchGetWorkspaces";
import DocumentsList from "./searchDocuments";

export default function ProjectsList() {
  const [token, setToken] = useState<string | undefined>();
  const [selectedWorkspace, setSelectedWorkspace] = useState<SelectedWorkspace>();
  const [loginError, setLoginError] = useState<string>();
  const [cachedProjects, setCachedProjects] = useState<StoredCachedProjctes>();
  const [workspaces, setWorkspaces] = useState<Me>();
  const [projects, setProjects] = useState<Project[] | undefined>();

  // const { data, error, isLoading } = useSearch(token, selectedWorkspace, query);

  // if (error) {
  //   showToast(ToastStyle.Failure, error);
  // }

  if (loginError) {
    showToast(ToastStyle.Failure, loginError);
  }

  const pullSelectedWorkspace = async (workspace: SelectedWorkspace) => {
    await setLocalStorageItem("selectedWorkspace", JSON.stringify(workspace));
    setSelectedWorkspace(workspace);
  };

  useEffect(() => {
    async function otherThings() {
      if (!selectedWorkspace || !workspaces || !token) return;
      try {
        const fetchedProjects = await getProjects(token, selectedWorkspace);
        setProjects(fetchedProjects);
        await setLocalStorageItem("cachedProjects", JSON.stringify(fetchedProjects));
      } catch (error) {
        console.error(error);
        console.log("err64");
        showToast(ToastStyle.Failure, (error as Error).message);
      }
    }
    otherThings();
  }, [selectedWorkspace, workspaces, token]);

  useEffect(() => {
    async function otherThings() {
      if (selectedWorkspace || !workspaces || !token) return;

      if (!workspaces?.workspaces) return;

      const { name, identifier } = workspaces?.workspaces[0];
      const workspaceToSelect = { name, identifier };
      setSelectedWorkspace(workspaceToSelect);
      await setLocalStorageItem("selectedWorkspace", JSON.stringify(workspaceToSelect));
      console.log("✓ storing first workspace avaiable");
    }
    otherThings();
  }, [selectedWorkspace, workspaces, token]);

  useEffect(() => {
    async function otherThings() {
      if (workspaces || !token) return;
      try {
        const fetchedWorkspaces = await getWorkspaces(token);
        setWorkspaces(fetchedWorkspaces?.data.me);
        await setLocalStorageItem("allWorkspaces", JSON.stringify(fetchedWorkspaces?.data.me));
        console.log("✓ storing all workspace names and identifiers");
      } catch (error) {
        console.error((error as Error).message);
        showToast(ToastStyle.Failure, (error as Error).message);
      }
    }
    otherThings();
  }, [workspaces, token]);

  const showCache = () => {
    const doWorkspacesMatch = selectedWorkspace?.identifier === cachedProjects?.identifier;
    return doWorkspacesMatch && !projects?.length;
  };

  useEffect(() => {
    async function cacheData() {
      console.log("caching...");
      await setLocalStorageItem(
        "cachedProjects",
        JSON.stringify({ identifier: selectedWorkspace?.identifier, projects: projects }),
      );
      console.log("caching done");
    }
    if (projects?.length && selectedWorkspace) cacheData();
  }, [projects]);

  useEffect(() => {
    async function fetch() {
      const { email, password }: Preferences = getPreferenceValues();
      const storedLasUsedEmail: string | undefined = await getLastUsedEmail();

      if (storedLasUsedEmail === email) {
        console.log("✓ logging in with *stored* email");
        const storedCachedProjects: StoredCachedProjctes = await getCachedProjects();
        if (storedCachedProjects) {
          console.log("✓ Found cached projects");
          setCachedProjects(storedCachedProjects);
        }

        const storedWorkspaces: Me = await getAllWorkspaces();
        if (storedWorkspaces) {
          console.log("✓ Found workspaces");
          setWorkspaces(storedWorkspaces);
        }

        const storedSelectedWorkspace = await getSelectedWorkspace();
        if (storedSelectedWorkspace) {
          console.log("✓ Found selected workspace");
          setSelectedWorkspace(storedSelectedWorkspace);
        }
      } else {
        console.log("✓ logging in with *new* email");
      }

      try {
        const fetchedToken: string = await login(email, password);
        setToken(fetchedToken);
        console.log("✓ logged in");
      } catch (error) {
        console.log((error as Error).message);
        setLoginError((error as Error).message);
      }
    }
    fetch();
  }, []);

  if ((!projects || !token || !selectedWorkspace) && !loginError && !cachedProjects) {
    return <List isLoading={true} searchBarPlaceholder="Search projects by name..." />;
  }

  return (
    <List
      isLoading={!projects?.length && !loginError}
      searchBarPlaceholder="Search projects by name..."
      throttle={true}
    >
      {selectedWorkspace && (
        <List.Section title={selectedWorkspace?.name}>
          {showCache()
            ? cachedProjects?.projects?.map((project) => (
                <ShareListItem
                  key={project.identifier}
                  project={project}
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
                  updateWorkspace={pullSelectedWorkspace}
                  token={token}
                />
              ))
            : projects?.map((project) => (
                <ShareListItem
                  key={project.identifier}
                  project={project}
                  workspaces={workspaces}
                  selectedWorkspace={selectedWorkspace}
                  updateWorkspace={pullSelectedWorkspace}
                  token={token}
                />
              ))}
        </List.Section>
      )}
    </List>
  );
}

function ShareListItem(props: {
  project: Project;
  workspaces: Me | undefined;
  selectedWorkspace: SelectedWorkspace;
  updateWorkspace: (workspace: SelectedWorkspace) => void;
  token: string | undefined;
}) {
  const project = props.project;
  const wp = props.workspaces;
  const { push } = useNavigation();

  const webUrl = `https://www.sketch.com/workspace/${props.selectedWorkspace.identifier}/p/${props.project.shortId}`;

  return (
    <List.Item
      id={project.identifier}
      key={project.identifier}
      title={project.name}
      icon={{ source: { dark: "folder-icon@dark.png", light: "folder-icon.png" } }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <ActionPanel.Item
              icon={Icon.List}
              title={`Open`}
              onAction={() =>
                push(<DocumentsList shortId={project.shortId} projectName={project.name} token={props.token} />)
              }
            />
            <OpenInBrowserAction url={webUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Workspaces">
            {wp?.personalWorkspace && (
              <ActionPanel.Item
                icon={Icon.Person}
                title={wp.personalWorkspace.name}
                shortcut={{ modifiers: ["ctrl"], key: "1" }}
                onAction={() =>
                  props.updateWorkspace({
                    name: wp.personalWorkspace.name,
                    identifier: wp.personalWorkspace.identifier,
                  })
                }
              />
            )}

            {wp?.workspaces?.map((workspace, index) => (
              <ActionPanel.Item
                key={workspace.identifier}
                icon={workspace.avatar?.small ?? Icon.Person}
                title={workspace.name}
                shortcut={{
                  modifiers: ["ctrl"],
                  key: (index + (wp?.personalWorkspace ? 2 : 1)).toString() as KeyEquivalent,
                }}
                onAction={() =>
                  props.updateWorkspace({
                    name: workspace.name,
                    identifier: workspace.identifier,
                  })
                }
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyToClipboardAction title="Copy Web URL" content={webUrl} />
            <CopyToClipboardAction title="Copy Project ID" content={props.project.shortId} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Other">
            <ActionPanel.Item
              icon={Icon.Trash}
              title={"Delete Cached Items"}
              onAction={async () => {
                await clearLocalStorage();
                showToast(ToastStyle.Success, "Done!", "Succesfully deleted cached items");
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
