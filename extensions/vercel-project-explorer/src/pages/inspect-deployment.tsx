import { Icon, Detail, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import getProjectMarkdown from "../markdown/get-deployment-markdown";
import { fromNow } from "../utils/time";
import { Build, Deployment } from "../types";
import { fetchDeploymentBuildsByDeploymentId } from "../vercel";

type Props = {
  deployment: Deployment;
};

const InspectDeployment = ({ deployment }: Props) => {
  const [build, setMostRecentBuild] = useState<Build>();
  const [markdown, setMarkdown] = useState<string>();

  useEffect(() => {
    if (!markdown) {
      getProjectMarkdown(deployment).then(setMarkdown);
    }
  });

  useEffect(() => {
    async function fetchBuilds() {
      const fetchedBuilds = await fetchDeploymentBuildsByDeploymentId(deployment.uid);
      setMostRecentBuild(fetchedBuilds ? fetchedBuilds[0] : undefined);
    }
    fetchBuilds();
  }, [deployment]);

  const getCommitMessage = (deployment: Deployment) => {
    // TODO: determine others
    if (deployment.meta.githubCommitMessage) {
      return deployment.meta.githubCommitMessage;
    }
    return "No commit message";
  };

  const getStateText = () => {
    return build?.readyState
      ? build.readyState.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase())
      : "";
  };

  return (
    <Detail
      navigationTitle={getCommitMessage(deployment)}
      isLoading={!markdown}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={`Open on Vercel`} url={`https://${deployment.url}`} icon={Icon.Link} />
          <Action.OpenInBrowser title={`Visit in Browser`} url={`https://${deployment}`} icon={Icon.Link} />
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title={"State"} text={getStateText()} />
          <Detail.Metadata.Link title={deployment.name} text={deployment.url} target={`https://${deployment.url}`} />
          <Detail.Metadata.Label title={"Commit"} text={getCommitMessage(deployment)} />
          <Detail.Metadata.Label title={"Created"} text={deployment.createdAt ? fromNow(deployment.createdAt) : ""} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title={""} text={"Open on Vercel"} target={`https://${deployment.url}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title={"Creator"} text={deployment.creator?.username || "Unknown"} />
        </Detail.Metadata>
      }
    />
  );
};

export default InspectDeployment;
