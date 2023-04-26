import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { getDeplymentStateIcon } from "../../lib/color";
import { EmptyView } from "../EmptyView";
import { IDeployment, IServer, ISite } from "../../types";
import { useDeployments } from "../../hooks/useDeployments";
import { formatDistance } from "date-fns";
import { useDeploymentOutput } from "../../hooks/useDeploymentOutput";

export const DeployHistory = ({ site, server }: { site: ISite; server: IServer }) => {
  const { deployments, loading } = useDeployments({ site, server });
  if (!deployments?.length && !loading) {
    return <EmptyView title="No deployments found" />;
  }
  return (
    <List isLoading={loading}>
      {deployments?.map((deployment: IDeployment) => (
        <DeployHistorySingle key={deployment.id} site={site} server={server} deployment={deployment} />
      ))}
    </List>
  );
};

const DeployHistorySingle = ({
  site,
  server,
  deployment,
}: {
  site: ISite;
  server: IServer;
  deployment: IDeployment;
}) => {
  const { text: stateText, icon } = getDeplymentStateIcon(deployment?.status ?? "unknown");
  const { id, started_at, ended_at, status } = deployment;
  return (
    <List.Item
      id={id.toString()}
      title={deployment?.commit_message || "No commit message"}
      subtitle={started_at ? formatDistance(new Date(started_at + " UTC"), new Date(), { addSuffix: true }) : undefined}
      icon={icon}
      accessories={[
        { text: deployment?.status === "deploying" ? "Deploying..." : undefined },
        {
          text:
            deployment?.status === "deploying"
              ? undefined
              : `${stateText} ${formatDistance(new Date(ended_at + " UTC"), new Date(started_at + " UTC"), {
                  addSuffix: true,
                })}`,
        },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Output"
            icon={Icon.Binoculars}
            target={
              // Disable when deploying so we dont need to keep checking state
              status !== "deploying" ? (
                <DeployDetails site={site} server={server} deployment={deployment} />
              ) : (
                <EmptyView title="Deploying site. Check back shortly." />
              )
            }
          />
        </ActionPanel>
      }
    />
  );
};

const DeployDetails = ({ site, server, deployment }: { site: ISite; server: IServer; deployment: IDeployment }) => {
  const { output, loading } = useDeploymentOutput({ site, server, deployment });
  const { status, commit_message, displayable_type, commit_author, commit_hash, started_at, ended_at } = deployment;
  return (
    <Detail
      isLoading={loading}
      markdown={output ? "```sh\n" + output + "\n```" : ""}
      navigationTitle={commit_message || "No commit message"}
      metadata={
        <Detail.Metadata>
          {commit_author && <Detail.Metadata.Label title="Commit Author" text={commit_author} />}
          {displayable_type && <Detail.Metadata.Label title="Via" text={displayable_type} />}
          <Detail.Metadata.Separator />
          {ended_at ? (
            <Detail.Metadata.TagList title="Runtime">
              <Detail.Metadata.TagList.Item
                text={formatDistance(new Date(ended_at + " UTC"), new Date(started_at + " UTC"), { addSuffix: false })}
                color={Color.Purple}
              />
            </Detail.Metadata.TagList>
          ) : null}
          <Detail.Metadata.Label title="Started At" text={new Date(started_at + " UTC").toLocaleString()} />
          {ended_at ? (
            <Detail.Metadata.Label title="Finished At" text={new Date(ended_at + " UTC").toLocaleString()} />
          ) : null}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={status || "Unknown"}
              color={
                status === "finished"
                  ? Color.Green
                  : status === "failed"
                  ? Color.Red
                  : status === "deploying"
                  ? Color.Purple
                  : Color.Magenta
              }
            />
          </Detail.Metadata.TagList>
          {commit_hash && <Detail.Metadata.Label title="Commit Hash" text={commit_hash} />}
        </Detail.Metadata>
      }
    />
  );
};
