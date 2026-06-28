import { List } from "@raycast/api";
import React from "react";
import { Workflow } from "../types/types";

export function DetailView(props: { workflow: Workflow }) {
  const { workflow } = props;
  return (
    <List.Item.Detail
      markdown={`\`\`\`\n${JSON.stringify(workflow.nodes, null, 2)}\n\`\`\``}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={"Id"} text={workflow.id + ""} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title={"Name"} text={workflow.name} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={"Updated At"}
            text={workflow.updatedAt.substring(0, 19).replace("T", " ")}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title={"Created At"}
            text={workflow.createdAt.substring(0, 19).replace("T", " ")}
          />
          {workflow.tags.length > 0 && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title={"Tags"} text={workflow.tags.join(", ")} />
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
