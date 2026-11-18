import { Detail, Icon, Color, Image, ActionPanel } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import OpenInSevallaAction from "../components/OpenInSevallaAction";
import { makeRequest } from "../sevalla";
import { Deployment, StaticSite, DeploymentDetailed } from "../types";
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
dayjs.extend(advancedFormat);

export default function GetDeploymentDetails({ deployment, site }: { deployment: Deployment; site: StaticSite }) {
  const { isLoading, data: details } = useCachedPromise(
    async (deploymentId: string) => {
      const result = await makeRequest<{ deployment: DeploymentDetailed }>(`static-sites/deployments/${deploymentId}`);
      return result.deployment;
    },
    [deployment.id],
  );
  const commit = details?.commit_sha?.slice(0, 6);
  const markdown = `# Deployment ${commit || "N/A"} @ ${deployment.branch} \n\n --- \n\n ${deployment.commit_message}`;
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Search Static Sites / ${site.display_name} / Deployments / ${commit || deployment.id}`}
      markdown={markdown}
      metadata={
        details && (
          <Detail.Metadata>
            <Detail.Metadata.Label
              icon={
                details.status === "success" ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.QuestionMark
              }
              title=""
              text={details.status === "success" ? "Deployment successful" : details.status}
            />
            <Detail.Metadata.Label
              title="Deploy started at"
              text={details.started_at ? dayjs(details.started_at).format("MMM D, YYYY, h:mm A") : "N/A"}
            />
            <Detail.Metadata.Label
              title="Duration"
              text={
                details.started_at && details.finished_at
                  ? `${dayjs(details.finished_at).diff(details.started_at, "second")}s`
                  : "N/A"
              }
            />
            <Detail.Metadata.Label
              title="Deployed branch"
              icon={getFavicon(new URL(details.repo_url).origin)}
              text={new URL(details.repo_url).pathname.slice(1)}
            />
            <Detail.Metadata.Link
              title=""
              text={details.branch}
              target={`${details.repo_url}/tree/${details.branch}`}
            />
            {commit ? (
              <Detail.Metadata.Link
                title="Commit"
                text={commit}
                target={`${details.repo_url}/commit/${details.commit_sha}`}
              />
            ) : (
              <Detail.Metadata.Label title="Commit" text="N/A" />
            )}

            <Detail.Metadata.Label
              title="Author"
              icon={details.author_img ? { source: details.author_img, mask: Image.Mask.Circle } : undefined}
              text={details.author_login || "N/A"}
            />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <OpenInSevallaAction route={`staticSite/${site.name}/deployment/${deployment.id}`} />
        </ActionPanel>
      }
    />
  );
}
