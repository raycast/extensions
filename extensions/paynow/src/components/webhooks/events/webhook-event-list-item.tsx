import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";
import { Color, List } from "@raycast/api";
import { useMemo } from "react";

const WebhookEventListItem = ({
  actions,
  detail,
  quickLook,
  event,
}: { event: ManagementSchemas["QueuedWebhookDto"] } & Pick<List.Item.Props, "actions" | "detail" | "quickLook">) => {
  const keywords = useMemo<string[]>(() => {
    const kw = [event.id];
    return kw;
  }, [event.id]);

  return (
    <List.Item
      id={event.id}
      key={event.id}
      title={event.id}
      subtitle={event.event.toUpperCase()}
      keywords={keywords}
      actions={actions}
      detail={detail}
      accessories={[
        {
          tag: {
            value: event.state,
            color: (() => {
              switch (event.state) {
                case "failed":
                  return Color.Red;
                case "pending":
                  return Color.Yellow;
                case "success":
                  return Color.Green;
              }
              return undefined;
            })(),
          },
        },
        { date: new Date(event.created_at) },
      ]}
      quickLook={quickLook}
    />
  );
};

export default WebhookEventListItem;
