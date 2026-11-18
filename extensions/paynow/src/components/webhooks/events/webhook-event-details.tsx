import { Action, ActionPanel, Color, Detail } from "@raycast/api";
import { withProviders } from "../../../hocs/with-providers";
import { Fragment, useMemo } from "react";
import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";

export interface WebhookEventDetailsProps {
  event: ManagementSchemas["QueuedWebhookDto"];
}

const WebhookEventDetails = ({ event }: WebhookEventDetailsProps) => {
  const markdown = useMemo(() => {
    return ["```json", JSON.stringify(event, null, 2), "```"].join("\n");
  }, [event]);

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="ID" text={event.id} />
          <Detail.Metadata.Label title="Webhook ID" text={event.webhook_id} />
          <Detail.Metadata.TagList title="Type">
            <Detail.Metadata.TagList.Item text={event.event.toUpperCase()} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={event.state}
              color={(() => {
                switch (event.state) {
                  case "failed":
                    return Color.Red;
                  case "pending":
                    return Color.Yellow;
                  case "success":
                    return Color.Green;
                }
              })()}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Sent At" text={new Date(event.created_at).toLocaleString()} />
          {event.next_retry && (
            <Detail.Metadata.Label title="Next Retry" text={new Date(event.next_retry).toLocaleString()} />
          )}
          {event.executions.map((exec, i) => (
            <Fragment key={exec.id}>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Execution Attempt" text={`${i + 1}`} />
              <Detail.Metadata.Label title="Execution ID" text={exec.id} />
              <Detail.Metadata.Label title="Started At" text={new Date(exec.started_at).toLocaleString()} />
              {exec.finished_at && (
                <Detail.Metadata.Label title="Finished At" text={new Date(exec.finished_at).toLocaleString()} />
              )}
              <Detail.Metadata.TagList title="Status">
                <Detail.Metadata.TagList.Item
                  text={exec.status_code.toString()}
                  color={(() => {
                    if (exec.status_code > 400) {
                      return Color.Red;
                    }
                    if (exec.status_code > 300) {
                      return Color.Yellow;
                    }
                    if (exec.status_code > 200) {
                      return Color.Green;
                    }
                  })()}
                />
              </Detail.Metadata.TagList>
            </Fragment>
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Event Payload" content={JSON.stringify(event.payload)} />
          <Action.CopyToClipboard title="Copy Event ID" content={event.id} />
        </ActionPanel>
      }
    />
  );
};

export default withProviders(WebhookEventDetails);
