import { Icon, Detail, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import getProjectMarkdown from "../markdown/get-deployment-markdown";
import fromNow from "../utils/time";
import { Build, Deployment } from "../types";
import { useFetch } from "@raycast/utils";
import { FetchHeaders, getFetchDeploymentBuildsURL } from "../vercel";

type Props = {
  deployment: Deployment;
};

const InspectDeployment = ({ deployment }: Props) => {
  // const [build, setMostRecentBuild] = useState<Build>();
  const [markdown, setMarkdown] = useState<string>();

  useEffect(() => {
    if (!markdown) {
      getProjectMarkdown(deployment).then(setMarkdown);
    }
  });

  // useEffect(() => {
  //   async function fetchBuilds() {
  //     // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
  //     const fetchedBuilds = await fetchDeploymentBuildsByDeploymentId(deployment.uid || deployment.id);
  //     setMostRecentBuild(fetchedBuilds ? fetchedBuilds[0] : undefined);
  //   }
  //   fetchBuilds();
  // }, [deployment]);

  // @ts-expect-error Property 'id' does not exist on type 'Deployment'.
  const url = getFetchDeploymentBuildsURL(deployment.uid || deployment.id);

  const { isLoading, data } = useFetch<{
    builds: Build[];
    // TODO: why can't I `{ headers: FetchHeaders }` here?
  }>(url, {
    // @ts-expect-error Type 'null' is not assignable to type 'string'.
    headers: FetchHeaders.get("Authorization") ? [["Authorization", FetchHeaders.get("Authorization")]] : [[]],
  });

  const mostRecentBuild = data?.builds?.[0];

  const getCommitMessage = (deployment: Deployment) => {
    // TODO: determine others
    if (deployment.meta.githubCommitMessage) {
      return deployment.meta.githubCommitMessage;
    }
    return "No commit message";
  };

  const getStateText = () => {
    return mostRecentBuild?.readyState
      ? mostRecentBuild.readyState.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      : "";
  };

  return (
    <Detail
      navigationTitle={getCommitMessage(deployment)}
      isLoading={isLoading || !markdown}
      markdown={markdown}
      actions={
        <ActionPanel>
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          <Action.OpenInBrowser title={`Open on Vercel`} url={`https://${deployment.inspectorUrl}`} icon={Icon.Link} />
          <Action.OpenInBrowser title={`Visit in Browser`} url={`https://${deployment.url}`} icon={Icon.Link} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={"State"} text={getStateText()} />
          <Detail.Metadata.Label title="Name" text={deployment.name} />
          <Detail.Metadata.Link title={"Site URL"} text={deployment.url} target={`https://${deployment.url}`} />
          {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
          {/* @ts-ignore */}
          {deployment.inspectorURL && (
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            <Detail.Metadata.Link title={"Inspect on Vercel"} text={deployment.url} target={deployment.inspectorURL} />
          )}
          <Detail.Metadata.Label title={"Commit Message"} text={getCommitMessage(deployment)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title={"Created"}
            text={deployment.createdAt ? fromNow(deployment.createdAt, new Date()) : ""}
          />
          <Detail.Metadata.Label title={"Creator"} text={deployment.creator?.username || "Unknown"} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title={""} text={"Open on Vercel"} target={`https://${deployment.url}`} />
        </Detail.Metadata>
      }
    />
  );
};

export default InspectDeployment;
