import { createPaynowQuery } from "../create-paynow-query";

export const useWebhooksList = createPaynowQuery({
  queryKey: "webhooksList",
  queryFn: async (api) => {
    const { data } = await api.management.webhooks.getSubscriptions();
    return data;
  },
});
