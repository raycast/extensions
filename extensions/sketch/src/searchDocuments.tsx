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
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Share } from "./types/sketch";
import { login } from "./utils/functions";
import useSearch from "./hooks/useSearch";

import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { Preferences, SelectedWorkspace } from "./types/preferences";
import { PersonalShare } from "./types/personalShare";
import { getSelectedWorkspace } from "./utils/storage";
TimeAgo.addDefaultLocale(en);

const timeAgo = new TimeAgo("en-US");
console.log("yes");

interface ToastError {
  title: string;
  message: string;
}

export default function DocumentsList() {
  const [query, setQuery] = useState<string>("");
  const [token, setToken] = useState<string | undefined>();
  const [selectedWorkspace, setSelectedWorkspace] = useState<SelectedWorkspace>();
  const [loginError, setLoginError] = useState<string>();
  const [workspaceError, setWorkspaceError] = useState<ToastError>();

  const { data, error, isLoading } = useSearch(token, selectedWorkspace, query);

  if (error) {
    showToast(ToastStyle.Failure, error);
  }

  if (loginError) {
    showToast(ToastStyle.Failure, loginError);
  }

  if (workspaceError) {
    showToast(ToastStyle.Failure, workspaceError.title, workspaceError.message);
  }

  useEffect(() => {
    async function fetch() {
      const { email, password }: Preferences = getPreferenceValues();

      try {
        const storedSelectedWorkspace = await getSelectedWorkspace();
        setSelectedWorkspace(storedSelectedWorkspace);
      } catch (error) {
        setWorkspaceError({
          title: "No workspace set!",
          message: 'Launch "Set Workspace" command to set one.',
        });
      }
      try {
        const fetchedToken: string = await login(email, password);
        setToken(fetchedToken);
      } catch (error) {
        console.log((error as ErrorEvent).message);
        setLoginError((error as ErrorEvent).message);
      }
    }
    fetch();
  }, []);

  if ((!data || !token || !selectedWorkspace) && !error && !loginError && !workspaceError) {
    return <List isLoading={true} searchBarPlaceholder="Search documents by name..." />;
  }

  return (
    <List
      isLoading={isLoading && !error && !loginError && !workspaceError}
      searchBarPlaceholder="Search documents by name..."
      onSearchTextChange={setQuery}
      throttle={true}
    >
      <List.Section title="Recent Documents">
        {data?.shares.map((share) => (
          <ShareListItem key={share.identifier} share={share} />
        ))}
      </List.Section>
    </List>
  );
}

function ShareListItem(props: { share: Share | PersonalShare }) {
  const thumbnail = () => {
    if (share.version.previewFiles?.length) {
      if (share.version.previewFiles[0]?.thumbnails?.length) {
        return share.version.previewFiles[0].thumbnails[0].url;
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  };

  const share = props.share;
  return (
    <List.Item
      id={share.identifier}
      key={share.identifier}
      title={share.name}
      subtitle={share.project?.name}
      keywords={share.project?.name ? [share.project.name] : []}
      icon={{ source: thumbnail() ?? Icon.Document, tintColor: Color.Yellow, mask: ImageMask.RoundedRectangle }}
      accessoryTitle={timeAgo.format(new Date(share.updatedAt)) as string}
      actions={
        <ActionPanel>
          <OpenAction
            icon={{ source: { light: "sketch-symbol-onlight.png", dark: "sketch-symbol-ondark.png" } }}
            title="Open In Sketch"
            target={`sketch://sketch.cloud/s/${share.identifier}`}
            application="Sketch"
          />
          <OpenInBrowserAction url={share.publicUrl} />
          <CopyToClipboardAction title="Copy URL" content={share.publicUrl} />
        </ActionPanel>
      }
    />
  );
}
