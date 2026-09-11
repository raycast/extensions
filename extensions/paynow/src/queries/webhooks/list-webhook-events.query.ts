import { createPaynowQuery } from "../create-paynow-query";

export const useWebhookEventsList = createPaynowQuery({
  queryKey: "webhookEventsList",
  queryFn: async (api, webhookId: string) => {
    const { data } = await api.management.webhooks.getHistory({
      path: {
        webhookId,
      },
    });
    return data;
  },
});
