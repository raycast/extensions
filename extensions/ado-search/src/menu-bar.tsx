import { MenuBarExtra, Icon, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { preparedPersonalAccessToken, baseApiUrl } from "./preferences";
import { AdoProjectResponse, AdoPrResponse, Project, PullRequest } from "./types";

const activeProject = "active";

export default () => {
  const { data, isLoading } = useFetch<AdoProjectResponse>(`${baseApiUrl()}/_apis/projects?api-version=1.0`, {
    headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
  });

  return (
    <MenuBarExtra icon={isLoading ? "Azure-DevOps-black-loading.png" : "Azure-DevOps-black.png"}>
      {isLoading && <MenuBarExtra.Item key="loading" title="Loading projects..." icon={Icon.Clock} />}
      {!isLoading && data?.value.map((project) => <MenuBarProjectItem key={project.id} project={project} />)}
    </MenuBarExtra>
  );
};

function MenuBarProjectItem(props: { project: Project }) {
  const { data } = useFetch<AdoPrResponse>(
    `${baseApiUrl()}/${props.project.id}/_apis/git/pullrequests?api-version=1.0`,
    {
      headers: { Accept: "application/json", Authorization: `Basic ${preparedPersonalAccessToken()}` },
    },
  );

  return (
    <MenuBarExtra.Section key={props.project.id} title={props.project.name}>
      {data?.value
        .filter((pullRequest) => pullRequest.status === activeProject)
        .sort((a, b) => a.repository.name.localeCompare(b.repository.name))
        .map((pullRequest) => (
          <MenuBarExtra.Item
            key={pullRequest.pullRequestId}
            title={generateTitle(pullRequest)}
            onAction={() => {
              open(generatePullRequestUrl(pullRequest));
            }}
          />
        ))}
    </MenuBarExtra.Section>
  );
}

function generateTitle(pullRequest: PullRequest) {
  return `${pullRequest.repository.name} - ${pullRequest.title} - Pull Request: ${pullRequest.pullRequestId}`;
}

function generatePullRequestUrl(pr: PullRequest) {
  return `${baseApiUrl()}/${pr.repository.project.name}/_git/${pr.repository.name}/pullrequest/${pr.pullRequestId}`;
}
