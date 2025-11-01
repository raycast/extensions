import { Icon, Detail, ActionPanel, Action, showToast, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import getProjectMarkdown from "../markdown/get-deployment-markdown";
import fromNow from "../utils/time";
import { Build, Deployment, Team, User } from "../types";
import { useFetch } from "@raycast/utils";
import { FetchHeaders, getDeploymentURL, getFetchDeploymentBuildsURL } from "../vercel";

type Props = {
  deployment: Deployment;
  selectedTeam?: Team;
  username?: User["username"];
};

const InspectDeployment = ({ deployment, selectedTeam, username }: Props) => {
  // const [build, setMostRecentBuild] = useState<Build>();
  const [markdown, setMarkdown] = useState<string>();

  useEffect(() => {
    if (!markdown) {
      getProjectMarkdown(deployment, selectedTeam).then(setMarkdown);
    }
  }, [markdown, deployment, selectedTeam]);

  // useEffect(() => {
  //   async function fetchBuilds() {
  //     // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
  //     const fetchedBuilds = await fetchDeploymentBuildsByDeploymentId(deployment.uid || deployment.id);
  //     setMostRecentBuild(fetchedBuilds ? fetchedBuilds[0] : undefined);
  //   }
  //   fetchBuilds();
  // }, [deployment]);

  // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
  const url = getFetchDeploymentBuildsURL(deployment.uid || deployment.id, selectedTeam?.id, 1);

  const { isLoading, data } = useFetch<{
    builds: Build[];
  }>(url, {
    headers: FetchHeaders,
  });

  const mostRecentBuild = data?.builds?.[0];

  const getCommitMessage = (deployment: Deployment) => {
    // TODO: determine others
    if (deployment.meta.githubCommitMessage) {
      return deployment.meta.githubCommitMessage;
    }
    return "No commit message";
  };

  const getCommitDeploymentBranch = (deployment: Deployment) => {
    // TODO: support other providers beside GitHub
    return deployment.meta.githubCommitRef ?? null;
  };
  const branchName = getCommitDeploymentBranch(deployment);

  const getStateText = () => {
    return mostRecentBuild?.readyState
      ? mostRecentBuild.readyState.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      : "";
  };

  // latestDeployment Deployments do not have an inspectorURL
  const deploymentURL = () => {
    // @ts-expect-error Property 'inspectorURL' does not exist on type 'Deployment'.
    if (deployment.inspectorURL) return deployment.inspectorURL;

    const teamSlug = selectedTeam?.slug || username;

    if (!teamSlug) {
      showToast({
        title: "Error",
        message: "Could not determine team or user name",
      });
      return "";
    }
    // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
    return getDeploymentURL(teamSlug, deployment.name, deployment.uid || deployment.id);
  };

  return (
    <Detail
      navigationTitle={getCommitMessage(deployment)}
      isLoading={isLoading || !markdown || !username}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={`Visit on Vercel`} url={deploymentURL()} icon={Icon.Link} />
          <Action.OpenInBrowser title={`Visit in Browser`} url={`https://${deployment.url}`} icon={Icon.Link} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={"State"} text={getStateText()} />
          <Detail.Metadata.Label title="Name" text={deployment.name} />
          <Detail.Metadata.Link title={"Preview URL"} text={deployment.url} target={`https://${deployment.url}`} />
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          {deployment.inspectorURL && (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            <Detail.Metadata.Link title={"Visit on Vercel"} text={deployment.url} target={deploymentURL()} />
          )}
          {branchName && (
            <Detail.Metadata.Label
              title="Git Branch"
              text={branchName}
              icon={{ source: "boxicon-git-branch.svg", tintColor: Color.SecondaryText }}
            />
          )}
          <Detail.Metadata.Label title={"Commit Message"} text={getCommitMessage(deployment)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={"Created"}
            text={deployment.createdAt ? fromNow(deployment.createdAt, new Date()) : ""}
          />
          <Detail.Metadata.Label title={"Creator"} text={deployment.creator?.username || "Unknown"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title={""} text={"Inspect on Vercel"} target={deploymentURL()} />
        </Detail.Metadata>
      }
    />
  );
};

export default InspectDeployment;
