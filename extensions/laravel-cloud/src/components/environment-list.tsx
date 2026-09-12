import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listEnvironments } from "../api/environments";
import { Environment } from "../types/environment";
import { getEnvironmentStatusIcon } from "../utils/status-icons";
import EnvironmentDetail from "./environment-detail";

interface Props {
  applicationId: string;
  applicationName: string;
}

export default function EnvironmentList({ applicationId, applicationName }: Props) {
  const { data, isLoading } = useCachedPromise(
    (appId: string) => listEnvironments(appId, undefined, "currentDeployment,instances"),
    [applicationId],
  );

  return (
    <List isLoading={isLoading} navigationTitle={applicationName}>
      {data?.data.map((env) => (
        <EnvironmentListItem key={env.id} environment={env} applicationName={applicationName} />
      ))}
    </List>
  );
}

function EnvironmentListItem({ environment, applicationName }: { environment: Environment; applicationName: string }) {
  const { attributes } = environment;
  const statusIcon = getEnvironmentStatusIcon(attributes.status);
  const instanceCount = environment.relationships?.instances?.data?.length ?? 0;

  return (
    <List.Item
      icon={{ source: statusIcon.icon, tintColor: statusIcon.color }}
      title={attributes.name}
      subtitle={attributes.vanity_domain ?? undefined}
      accessories={[
        { tag: { value: attributes.status, color: statusIcon.color } },
        { text: `PHP ${attributes.php_major_version}` },
        { text: `${instanceCount} instance${instanceCount !== 1 ? "s" : ""}` },
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Details"
            icon={Icon.Eye}
            target={
              <EnvironmentDetail
                environmentId={environment.id}
                applicationName={applicationName}
                environmentName={attributes.name}
              />
            }
          />
          {attributes.vanity_domain && (
            <Action.OpenInBrowser title="Open Vanity Domain" url={`https://${attributes.vanity_domain}`} />
          )}
        </ActionPanel>
      }
    />
  );
}
