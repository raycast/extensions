import { Detail } from "@raycast/api";
import { WorkItemDetails } from "../../models/task";
import { GetTaskIconType, GetIconColor } from "../../utils/IconType";
import TurndownService from "turndown";

export default function TaskDetails({ workItemDetails }: { workItemDetails: WorkItemDetails }) {
  const turndownService = new TurndownService();
  const descriptionMarkdown = turndownService.turndown(workItemDetails.fields["System.Description"] || "");
  const criteriaMarkdown = turndownService.turndown(
    workItemDetails.fields["Microsoft.VSTS.Common.AcceptanceCriteria"] || "",
  );
  const date = new Date(workItemDetails.fields["System.CreatedDate"]);
  let markdown = `# ${workItemDetails.fields["System.Title"]} \n\n`;

  if (descriptionMarkdown.length > 0) {
    markdown += `--- \n ## Description \n ${descriptionMarkdown} \n\n`;
  }

  if (criteriaMarkdown.length > 0) {
    markdown += `--- \n ## Acceptance Criteria \n ${criteriaMarkdown}\n\n`;
  }

  if (descriptionMarkdown.length == 0 && criteriaMarkdown.length == 0) {
    markdown += `No description available`;
  }

  return (
    <Detail
      markdown={markdown}
      navigationTitle={workItemDetails.id.toString()}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="State"
            icon={{
              source: GetTaskIconType(workItemDetails.fields["System.State"]),
              tintColor: GetIconColor(workItemDetails.fields["System.State"]),
            }}
            text={workItemDetails.fields["System.State"]}
          />
          <Detail.Metadata.Label title="Assigned to" text={workItemDetails.fields["System.AssignedTo"]} />
          <Detail.Metadata.Label title="Date created" text={date.toISOString().split("T")[0]} />
        </Detail.Metadata>
      }
    />
  );
}
