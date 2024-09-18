import { DeployRequest } from "../api";
import { Color, Icon, List } from "@raycast/api";
import { getDeployRequestIcon, getUserIcon } from "../icons";
import { useDeployOperations } from "../hooks/use-deploy-operations";
import { format as formatSQL } from "sql-formatter";
import { PlanetScaleColor } from "../colors";
import { titleCase } from "../utils";
import { countBy } from "lodash";

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

  const schemaChanges = countBy(deployOperations, (d) => d.operation_name.toLowerCase());

  const sql = deployOperations
    ?.map((deployOperation) => "```sql\n" + formatSQL(deployOperation.ddl_statement, { language: "mysql" }) + "\n```")
    .join("\n\n");
  let markdown = "";
  markdown += `### Summary\n\n${deployRequest.notes || `*No summary found*`}\n\n`;
  markdown += `### Schema changes\n\n`;
  if (sql) {
    markdown += `\n\n${sql}`;
  } else if (deployOperationsLoading) {
    markdown += "\n\n```sql\n\n\n\n```";
  } else {
    markdown += "*No schema changes*";
  }

  return (
    <List.Item.Detail
      isLoading={deployOperationsLoading}
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.TagList title="Status">
            <List.Item.Detail.Metadata.TagList.Item
              text={titleCase(deployRequest.state)}
              color={getDeployRequestIcon(deployRequest).tintColor}
            />
            <List.Item.Detail.Metadata.TagList.Item
              text={titleCase(deployRequest.deployment_state)}
              color={getDeployRequestIcon(deployRequest).tintColor}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.TagList title="Schema changes">
            <List.Item.Detail.Metadata.TagList.Item
              icon={{
                source: "table-add.svg",
                tintColor: schemaChanges.create ? PlanetScaleColor.Green : Color.SecondaryText,
              }}
              text={(schemaChanges.create ?? 0).toString()}
              color={schemaChanges.create ? PlanetScaleColor.Green : Color.SecondaryText}
            />
            <List.Item.Detail.Metadata.TagList.Item
              icon={{
                source: "table-edit.svg",
                tintColor: schemaChanges.alter ? PlanetScaleColor.Yellow : Color.SecondaryText,
              }}
              text={(schemaChanges.alter ?? 0).toString()}
              color={schemaChanges.alter ? PlanetScaleColor.Yellow : Color.SecondaryText}
            />
            <List.Item.Detail.Metadata.TagList.Item
              icon={{
                source: "table-delete.svg",
                tintColor: schemaChanges.delete ? PlanetScaleColor.Red : Color.SecondaryText,
              }}
              text={(schemaChanges.delete ?? 0).toString()}
              color={schemaChanges.delete ? PlanetScaleColor.Red : Color.SecondaryText}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label
            title="Author"
            text={deployRequest.actor.display_name}
            icon={getUserIcon(deployRequest.actor)}
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
