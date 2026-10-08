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
  const { id, started_at, ended_at, status } = deployment;
  // A running deploy has no ended_at, and its status string is not "deploying"
  const running = !ended_at;
  const { text: stateText, icon } = getDeplymentStateIcon(running ? "deploying" : (status ?? "unknown"));
  const runtime =
    started_at && ended_at ? formatDistance(new Date(ended_at), new Date(started_at), { addSuffix: true }) : "";
  return (
    <List.Item
      id={id.toString()}
      title={deployment?.commit?.message || "No commit message"}
      subtitle={started_at ? formatDistance(new Date(started_at), new Date(), { addSuffix: true }) : undefined}
      icon={icon}
      accessories={[{ text: running ? "Deploying..." : `${stateText} ${runtime}`.trim() }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Output"
            icon={Icon.Binoculars}
            target={
              // Disable when deploying so we dont need to keep checking state
              running ? (
                <EmptyView title="Deploying site. Check back shortly." />
              ) : (
                <DeployDetails site={site} server={server} deployment={deployment} />
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
  const { status, commit, type, started_at, ended_at } = deployment;
  return (
    <Detail
      isLoading={loading}
      markdown={output ? "```sh\n" + output + "\n```" : ""}
      navigationTitle={commit?.message || "No commit message"}
      metadata={
        <Detail.Metadata>
          {commit?.author && <Detail.Metadata.Label title="Commit Author" text={commit.author} />}
          {type && <Detail.Metadata.Label title="Via" text={type} />}
          <Detail.Metadata.Separator />
          {started_at && ended_at ? (
            <Detail.Metadata.TagList title="Runtime">
              <Detail.Metadata.TagList.Item
                text={formatDistance(new Date(ended_at), new Date(started_at), { addSuffix: false })}
                color={Color.Purple}
              />
            </Detail.Metadata.TagList>
          ) : null}
          {started_at ? (
            <Detail.Metadata.Label title="Started At" text={new Date(started_at).toLocaleString()} />
          ) : null}
          {ended_at ? <Detail.Metadata.Label title="Finished At" text={new Date(ended_at).toLocaleString()} /> : null}
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
          {commit?.hash && <Detail.Metadata.Label title="Commit Hash" text={commit.hash} />}
        </Detail.Metadata>
      }
    />
  );
};
