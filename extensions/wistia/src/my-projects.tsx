import { showToast, popToRoot, List, ActionPanel, Action, Toast, Icon, Detail } from "@raycast/api";
import groupBy from "lodash.groupby";
import { WistiaMediaListItem } from "./wistia-media-list-item";
import { AccountInfo } from "./types";
import { fetchProjects, fetchProjectMedias, fetchAccountInfo, fetchProjectStats } from "./api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";

export default function SearchProjectsCommand() {
  const [accountInfo, setAccountInfo] = useCachedState<AccountInfo>("account-info");
  const { isLoading, data: projects } = useCachedPromise(
    async () => {
      const [accountInfo, projects] = await Promise.all([fetchAccountInfo(), fetchProjects()]);
      setAccountInfo(accountInfo);
      return projects;
    },
    [],
    {
      initialData: [],
      async onError(error) {
        if (error.message === "unauthorized_credentials") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Invalid Credentials",
            message: "Check your API token and try again.",
          });
          popToRoot({ clearSearchBar: true });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to load projects",
          });
        }
      },
    },
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter by name or hashed id">
      {projects.map((project) => (
        <List.Item
          title={project.name ?? "No title"}
          subtitle={project.description}
          keywords={[project.hashedId]}
          key={project.id}
          actions={
            <ActionPanel title={project.name}>
              <Action.Push
                icon={Icon.FilmStrip}
                title="Show Medias"
                target={<ProjectMediaList hashedId={project.hashedId} accountInfo={accountInfo} />}
              />
              <Action.OpenInBrowser url={`${accountInfo?.url}/projects/${project.hashedId}`} />
              {/* eslint-disable-next-line @raycast/prefer-title-case */}
              <Action.CopyToClipboard title="Copy Hashed ID" content={project.hashedId} />
              <Action.Push
                icon={Icon.LineChart}
                title="View Project Stats"
                target={<ProjectStatsDetail hashedId={project.hashedId} />}
              />
            </ActionPanel>
          }
          accessories={[
            {
              text: `${project.mediaCount} ${project.mediaCount === 1 ? "media" : "medias"}`,
            },
          ]}
        />
      ))}
    </List>
  );
}

function ProjectMediaList({ hashedId, accountInfo }: { hashedId: string; accountInfo?: AccountInfo }) {
  const { isLoading, data: project } = useCachedPromise(async () => await fetchProjectMedias(hashedId), [], {
    async onError(error) {
      await showFailureToast("There was an error loading project medias", {
        title: error.message,
      });
    },
  });
  const groupedMedias = groupBy(project?.medias, (media) => media.section);

  return (
    <List isLoading={isLoading}>
      {!isLoading && project && !project.medias?.length && (
        <List.EmptyView
          icon="content-library.svg"
          title={project.name}
          description="Get started by adding a video to your folder - you can always delete it later!"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser icon={Icon.Plus} title="Add Media" url={`${accountInfo?.url}/content/media`} />
            </ActionPanel>
          }
        />
      )}
      {Object.entries(groupedMedias).map(([section, medias]) => {
        if (section === "undefined") {
          return medias.map(
            (media) => accountInfo && <WistiaMediaListItem media={media} accountInfo={accountInfo} key={media.id} />,
          );
        }

        return (
          <List.Section title={section} key={section}>
            {medias.map(
              (media) => accountInfo && <WistiaMediaListItem media={media} accountInfo={accountInfo} key={media.id} />,
            )}
          </List.Section>
        );
      })}
    </List>
  );
}

function ProjectStatsDetail({ hashedId }: { hashedId: string }) {
  const { isLoading, data } = useCachedPromise(async () => await fetchProjectStats(hashedId));

  const markdown = !data
    ? ""
    : `
| - | - |
|---|---|
| Load Count | ${data.load_count} |
| Play Count | ${data.play_count} |
| Hours Watched | ${data.hours_watched} |`;

  return <Detail isLoading={isLoading} markdown={markdown} />;
}
