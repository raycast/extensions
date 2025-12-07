import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  Color,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  getPreferenceValues,
  OpenAction,
  ImageMask,
  setLocalStorageItem,
  KeyEquivalent,
  clearLocalStorage,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Share } from "./types/SketchWorkspaceShare";
import { getWorkspaces, login } from "./utils/functions";
import useSearch from "./hooks/useSearch";
import { Preferences, SelectedWorkspace, StoredCachedData } from "./types/preferences";
import { PersonalShare } from "./types/SketchPersonalShare";
import { getAllWorkspaces, getCachedData, getLastUsedEmail, getSelectedWorkspace } from "./utils/storage";

import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { Me } from "./types/SketchGetWorkspaces";
import { EntriesEntity } from "./types/SketchProjectShares";
TimeAgo.addDefaultLocale(en);

const timeAgo = new TimeAgo("en-US");

export default function DocumentsList(props: { projectName?: string; shortId?: string; token?: string }) {
  const [query, setQuery] = useState<string>("");
  const [token, setToken] = useState<string | undefined>();
  const [selectedWorkspace, setSelectedWorkspace] = useState<SelectedWorkspace>();
  const [loginError, setLoginError] = useState<string>();
  const [cachedData, setCachedData] = useState<StoredCachedData>();
  const [workspaces, setWorkspaces] = useState<Me>();
  const { pop } = useNavigation();

  const { data, error, isLoading } = useSearch(token, selectedWorkspace, query, props.shortId);

  if (error) {
    showToast(ToastStyle.Failure, error);
  }

  if (loginError) {
    showToast(ToastStyle.Failure, loginError);
  }

  const pullSelectedWorkspace = async (workspace: SelectedWorkspace) => {
    if (workspace.identifier !== selectedWorkspace?.identifier) {
      await setLocalStorageItem("selectedWorkspace", JSON.stringify(workspace));
      if (props.shortId) pop();
      setSelectedWorkspace(workspace);
    }
  };

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
    const doWorkspacesMatch = selectedWorkspace?.identifier === cachedData?.identifier;
    return doWorkspacesMatch && !data?.shares.length;
  };

  useEffect(() => {
    async function cacheData() {
      console.log("caching...");
      await setLocalStorageItem(
        "cachedData",
        JSON.stringify({ identifier: selectedWorkspace?.identifier, shares: data?.shares }),
      );
      console.log("caching done");
    }
    if (data?.shares.length && selectedWorkspace && !props.shortId) cacheData();
  }, [data]);

  useEffect(() => {
    async function fetch() {
      const { email, password }: Preferences = getPreferenceValues();
      const storedLasUsedEmail: string | undefined = await getLastUsedEmail();

      if (storedLasUsedEmail === email) {
        console.log("✓ logging in with *stored* email");

        if (!props.shortId) {
          const storedCachedData: StoredCachedData = await getCachedData();
          if (storedCachedData) {
            console.log("✓ Found cached data");
            setCachedData(storedCachedData);
          }
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

      if (props.token) {
        setToken(props.token);
        return console.log("Token got from Projects");
      }

      await setLocalStorageItem("lastUsedEmail", email);

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

  if ((!data || !token || !selectedWorkspace) && !error && !loginError && !cachedData) {
    return <List isLoading={true} searchBarPlaceholder="Search documents by name..." />;
  }

  return (
    <List
      isLoading={isLoading && !error && !loginError}
      searchBarPlaceholder="Search documents by name..."
      onSearchTextChange={setQuery}
      throttle={true}
    >
      {selectedWorkspace && (
        <List.Section title={selectedWorkspace?.name} subtitle={props.projectName ?? `Recent Documents`}>
          {showCache()
            ? cachedData?.shares?.map((share) => (
                <ShareListItem
                  key={share.identifier}
                  share={share}
                  workspaces={workspaces}
                  updateWorkspace={pullSelectedWorkspace}
                  projectName={props.projectName}
                />
              ))
            : data?.shares?.map((share) => (
                <ShareListItem
                  key={share.identifier}
                  share={share}
                  workspaces={workspaces}
                  updateWorkspace={pullSelectedWorkspace}
                  projectName={props.projectName}
                />
              ))}
        </List.Section>
      )}
    </List>
  );
}

function ShareListItem(props: {
  share: Share | PersonalShare | EntriesEntity;
  workspaces: Me | undefined;
  updateWorkspace: (workspace: SelectedWorkspace) => void;
  projectName?: string;
}) {
  const thumbnail = () => {
    if (props.share.version.previewFiles?.length) {
      if (props.share.version.previewFiles[0]?.thumbnails?.length) {
        return props.share.version.previewFiles[0].thumbnails[0].url;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  };

  const sketchUrl = `sketch://sketch.cloud/s/${props.share.identifier}`;

  return (
    <List.Item
      id={props.share.identifier}
      key={props.share.identifier}
      title={props.share.name}
      subtitle={props.projectName?.length ? "" : props.share.project?.name}
      keywords={props.share.project?.name ? [props.share.project.name] : []}
      icon={{ source: thumbnail() ?? Icon.Document, tintColor: Color.Yellow, mask: ImageMask.RoundedRectangle }}
      accessoryTitle={timeAgo.format(new Date(props.share.updatedAt)) as string}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenAction
              icon={{ source: { light: "sketch-symbol-onlight.png", dark: "sketch-symbol-ondark.png" } }}
              title="Open In Sketch"
              target={sketchUrl}
              application="Sketch"
            />
            <OpenInBrowserAction url={props.share.publicUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Workspaces">
            {props.workspaces?.personalWorkspace && (
              <ActionPanel.Item
                icon={Icon.Person}
                title={props.workspaces.personalWorkspace.name}
                shortcut={{ modifiers: ["ctrl"], key: "1" }}
                onAction={() =>
                  props.workspaces &&
                  props.updateWorkspace({
                    name: props.workspaces.personalWorkspace.name,
                    identifier: props.workspaces.personalWorkspace.identifier,
                  })
                }
              />
            )}

            {props.workspaces?.workspaces?.map((workspace, index) => (
              <ActionPanel.Item
                key={workspace.identifier}
                icon={workspace.avatar?.small ?? Icon.Person}
                title={workspace.name}
                shortcut={{
                  modifiers: ["ctrl"],
                  key: (index + (props.workspaces?.personalWorkspace ? 2 : 1)).toString() as KeyEquivalent,
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
            <CopyToClipboardAction title="Copy Web URL" content={props.share.publicUrl} />
            <CopyToClipboardAction title="Copy Sketch URL" content={sketchUrl} />
            <CopyToClipboardAction title="Copy Document ID" content={props.share.identifier} />
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
