import { List } from "@raycast/api";
import { type Project } from "../../api/index.js";
import { NO_DATA } from "../../utils/constants.js";
import { formatBoolean, formatDuration, useFormatters } from "../../utils/formatters.js";
import { djs } from "../../utils/time.js";
import { createColorIcon } from "../../utils/color.js";

export function ProjectDetails({ project }: { project: Project }) {
  const formatters = useFormatters();

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Name" text={project.name} />
          <List.Item.Detail.Metadata.Label title="Archived" text={formatBoolean(project.is_archived)} />
          <List.Item.Detail.Metadata.Label title="Public" text={formatBoolean(project.is_public)} />
          <List.Item.Detail.Metadata.Label title="Color" icon={createColorIcon(project.color)} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Is Billable" text={formatBoolean(project.is_billable)} />
          <List.Item.Detail.Metadata.Label
            title="Billing Rate"
            text={project.is_billable ? formatters.projectBilling(project.billable_rate) : NO_DATA}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Spent Time"
            text={project.spent_time ? formatDuration(djs.duration({ seconds: project.spent_time })) : NO_DATA}
          />
          <List.Item.Detail.Metadata.Label
            title="Estimated Time"
            text={project.estimated_time ? formatDuration(djs.duration({ seconds: project.estimated_time })) : NO_DATA}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="ID" text={project.id} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
