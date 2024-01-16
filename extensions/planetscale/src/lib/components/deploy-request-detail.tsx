import { DeployRequest } from "../api";
import { Icon, Image, List } from "@raycast/api";
import { getDeployRequestIcon } from "./icons";
import { capitalize } from "lodash";
import { useDeployOperations } from "../hooks/use-deploy-operations";
import { format as formatSQL } from "sql-formatter";
import { PlanetScaleColor } from "../colors";

export function DeployRequestDetail({
  deployRequest,
  organization,
  database,
}: {
  deployRequest: DeployRequest;
  organization: string;
  database: string;
}) {
  const { deployOperations, deployOperationsLoading } = useDeployOperations({
    organization,
    database,
    number: deployRequest.number.toString(),
  });

  const sql = deployOperations
    ?.map((deployOperation) => "```sql\n" + formatSQL(deployOperation.ddl_statement, { language: "mysql" }) + "\n```")
    .join("\n\n");

  const markdown = `${deployRequest.notes}\n\n${sql ? sql : "```sql\n\n\n\n```"}`;

  return (
    <List.Item.Detail
      isLoading={deployOperationsLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={capitalize(deployRequest.state)}
              color={getDeployRequestIcon(deployRequest).tintColor}
            />
            {deployRequest.state === "open" ? (
              <List.Item.Detail.Metadata.TagList.Item
                text={capitalize(deployRequest.deployment_state)}
                color={getDeployRequestIcon(deployRequest).tintColor}
              />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={deployRequest.actor.display_name}
            icon={{
              source: deployRequest.actor.avatar_url,
              mask: Image.Mask.Circle,
            }}
          />
          {deployRequest.approved ? (
            <List.Item.Detail.Metadata.Label
              title="Approved"
              icon={{
                source: Icon.CheckCircle,
                tintColor: PlanetScaleColor.Green,
              }}
            />
          ) : null}
          <List.Item.Detail.Metadata.Separator />
          {deployRequest.deployed_at ? (
            <List.Item.Detail.Metadata.Label
              title="Deployed at"
              text={new Date(deployRequest.deployed_at).toLocaleString()}
            />
          ) : deployRequest.closed_at ? (
            <List.Item.Detail.Metadata.Label
              title="Closed at"
              text={new Date(deployRequest.closed_at).toLocaleString()}
            />
          ) : null}
          <List.Item.Detail.Metadata.Label
            title="Created at"
            text={new Date(deployRequest.created_at).toLocaleString()}
          />
          <List.Item.Detail.Metadata.Label
            title="Updated at"
            text={new Date(deployRequest.updated_at).toLocaleString()}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
