import { List } from "@raycast/api";
import { useEffect } from "react";

export default function SearchWebhookWorkflowsCommand() {
  useEffect(() => {
    console.log("Rendering SearchWebhookWorkflowsCommand");
  }, []);

  return (
    <List>
      <List.EmptyView title="No Workflows Found" />
    </List>
  );
}
