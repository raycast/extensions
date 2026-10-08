import type { ManagementSchemas } from "@paynow-gg/typescript-sdk";
import { Icon, List } from "@raycast/api";
import { useMemo } from "react";

const WebhookListItem = ({
  actions,
  detail,
  quickLook,
  webhook,
}: { webhook: ManagementSchemas["WebhookSubscriptionDto"] } & Pick<
  List.Item.Props,
  "actions" | "detail" | "quickLook"
>) => {
  const keywords = useMemo<string[]>(() => {
    const kw = [webhook.id, webhook.url];
    return kw;
  }, [webhook.id, webhook.url]);

  const icon = useMemo(() => {
    if (webhook.type.toLowerCase().startsWith("json")) {
      return Icon.Globe;
    }
    if (webhook.type.toLowerCase().startsWith("discord")) {
      return Icon.SpeechBubble;
    }
    return undefined;
  }, [webhook.type]);

  return (
    <List.Item
      id={webhook.id}
      key={webhook.id}
      title={webhook.url}
      keywords={keywords}
      actions={actions}
      detail={detail}
      accessories={[{ text: `${webhook.subscribed_to.split(",").length} Events` }]}
      icon={icon}
      quickLook={quickLook}
    />
  );
};

export default WebhookListItem;
