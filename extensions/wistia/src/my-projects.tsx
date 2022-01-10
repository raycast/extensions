import {
  showToast,
  popToRoot,
  useNavigation,
  List,
  ActionPanel,
  CopyToClipboardAction,
  OpenInBrowserAction,
  PushAction,
  ToastStyle,
} from "@raycast/api";
import { useEffect, useState } from "react";
import groupBy from "lodash.groupby";
import { WistiaMediaListItem } from "./wistia-media-list-item";
import { AccountInfo, WistiaProject, WistiaApiError } from "./types";
import { fetchProjects, fetchProjectMedias, fetchAccountInfo } from "./api";

interface State {
  projects?: WistiaProject[];
  error?: unknown;
}

export default function SearchProjectsCommand() {
  const [state, setState] = useState<State>({});
  const [accountInfo, setAccountInfo] = useState<AccountInfo>();

  useEffect(() => {
    async function fetchData() {
      try {
        const [accountInfo, projects] = await Promise.all([fetchAccountInfo(), fetchProjects()]);
        setAccountInfo(accountInfo);
        setState({ projects });
      } catch (error: unknown) {
        if ((error as WistiaApiError)?.code === "unauthorized_credentials") {
          showToast(ToastStyle.Failure, "Invalid Credentials", "Check your API token and try again.");
          popToRoot({ clearSearchBar: true });
        } else {
          showToast(ToastStyle.Failure, "Failed to load projects");
        }
      }
    }

    fetchData();
  }, []);

  return (
    <List
      isLoading={state.projects?.length === 0 || !state.projects}
      searchBarPlaceholder="Filter by name or hashed id..."
    >
      {state.projects?.map((project) => (
        <List.Item
          accessoryTitle={`${project.mediaCount} ${project.mediaCount === 1 ? "media" : "medias"}`}
          title={project.name ?? "No title"}
          subtitle={project.description}
          keywords={[project.hashedId]}
          key={project.id}
          actions={
            <ActionPanel title={project.name}>
              <PushAction
                title="Show Medias"
                target={<ProjectMediaList hashedId={project.hashedId} accountInfo={accountInfo} />}
              />
              <OpenInBrowserAction url={`${accountInfo?.url}/projects/${project.hashedId}`} />
              <CopyToClipboardAction title="Copy HashedId" content={project.hashedId} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ProjectMediaList({ hashedId, accountInfo }: { hashedId: string; accountInfo?: AccountInfo }) {
  const [project, setProject] = useState<WistiaProject>();
  const { pop } = useNavigation();

  useEffect(() => {
    async function fetchData() {
      try {
        const project = await fetchProjectMedias(hashedId);
        setProject(project);
      } catch (error: unknown) {
        showToast(ToastStyle.Failure, "Error!", "There was an error loading project medias");
        pop();
      }
    }

    fetchData();
  }, []);

  const groupedMedias = groupBy(project?.medias, (media) => media.section);

  return (
    <List isLoading={!project}>
      {Object.entries(groupedMedias).map(([section, medias]) => {
        if (section === "undefined") {
          return medias.map(
            (media) => accountInfo && <WistiaMediaListItem media={media} accountInfo={accountInfo} key={media.id} />
          );
        }

        return (
          <List.Section title={section} key={section}>
            {medias.map(
              (media) => accountInfo && <WistiaMediaListItem media={media} accountInfo={accountInfo} key={media.id} />
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
