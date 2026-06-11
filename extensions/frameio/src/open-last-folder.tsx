import { JSX } from "react";
import { Detail, ActionPanel, Action, Icon, List, open, launchCommand, LaunchType, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorize } from "./auth";
import { formatDate, listFolderChildren, getThumbnailUrl } from "./api/frameio";
import { FolderView } from "./components/FolderView";
import { RequireClientId } from "./components/RequireClientId";
import { getLastFolder, loadLastFolderDetails, LastFolder } from "./last-folder";

type State = "loading" | "empty" | "ready" | "error";

interface FolderDetails {
  title: string;
  viewUrl?: string;
  thumbnailUrl?: string;
  updatedAt?: string;
}

export default function OpenLastFolderCommand(): JSX.Element {
  return (
    <RequireClientId>
      <OpenLastFolderMain />
    </RequireClientId>
  );
}

function OpenLastFolderMain(): JSX.Element {
  const { push } = useNavigation();
  const [state, setState] = useState<State>("loading");
  const [last, setLast] = useState<LastFolder | null>(null);
  const [details, setDetails] = useState<FolderDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function run() {
      try {
        await authorize();
        const stored = await getLastFolder();

        if (!stored) {
          setState("empty");
          return;
        }

        setLast(stored);
        const loaded = await loadLastFolderDetails(stored);

        if (loaded.viewUrl) {
          await open(loaded.viewUrl);
        }

        setDetails(loaded);
        setState("ready");

        if (!loaded.thumbnailUrl) {
          listFolderChildren(stored.accountId, stored.folderId, { pageSize: 20 })
            .then((children) => {
              for (const item of children.data) {
                let thumb: string | undefined;
                if (item.type === "file") thumb = getThumbnailUrl(item);
                else if (item.type === "version_stack" && item.head_version) {
                  thumb = getThumbnailUrl(item.head_version);
                }
                if (thumb) {
                  setDetails((prev) => (prev ? { ...prev, thumbnailUrl: thumb } : prev));
                  break;
                }
              }
            })
            .catch(() => undefined);
        }
      } catch (error) {
        setErrorMessage(String(error));
        setState("error");
      }
    }
    run();
  }, []);

  if (state === "loading") {
    return <List isLoading />;
  }

  if (state === "empty") {
    return (
      <Detail
        markdown={`# No Recent Folder

Browse your Frame.io account to automatically save the last folder you visited.

This command will then show a preview with a thumbnail.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Browse"
              icon={Icon.Folder}
              onAction={() => launchCommand({ name: "browse", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (state === "error") {
    return <Detail markdown={`# Could Not Load Folder\n\n${errorMessage}`} />;
  }

  if (!last || !details) {
    return <List isLoading />;
  }

  const markdown = details.thumbnailUrl ? `![](${details.thumbnailUrl})\n\n# ${details.title}` : `# ${details.title}`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Folder" text={details.title} />
          {details.updatedAt && <Detail.Metadata.Label title="Modified" text={formatDate(details.updatedAt)} />}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Browse in Raycast"
              icon={Icon.ArrowRight}
              onAction={() =>
                push(<FolderView accountId={last.accountId} folderId={last.folderId} title={details.title} />)
              }
            />
            {details.viewUrl && <Action.OpenInBrowser title="Reopen Folder in Frame.io" url={details.viewUrl} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
