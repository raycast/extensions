import { List, Color, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ApiSuccessResponse, WebhookMessage } from "vartiq";
import { vartiq } from "./vartiq";

export default function WebhookMessages({
  webhookId,
  navigationTitle,
}: {
  webhookId: string;
  navigationTitle: string;
}) {
  const { isLoading, data: messages } = useCachedPromise(
    async (webhookId: string) => {
      const { data } = await vartiq.request<ApiSuccessResponse<WebhookMessage[]>>(
        `webhook-messages?webhookIds=${webhookId}`,
      );
      return data;
    },
    [webhookId],
    { initialData: [] },
  );

  return (
    <List isLoading={isLoading} navigationTitle={navigationTitle}>
      {messages.map((message) => (
        <List.Section key={message.id} title={message.payload} subtitle={`${message.attempts.length} attempts`}>
          {message.attempts.map((attempt) => (
            <List.Item
              key={attempt._id}
              icon={Icon.LineChart}
              title={attempt._id}
              accessories={[
                {
                  tag: {
                    value: attempt.statusCode.toString(),
                    color: attempt.statusCode >= 200 && attempt.statusCode < 300 ? Color.Green : Color.Red,
                  },
                  tooltip: attempt.response,
                },
                { date: new Date(attempt.createdAt) },
              ]}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
