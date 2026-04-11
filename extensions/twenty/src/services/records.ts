import type { TwentyClient } from "./client";

export const createRecordsService = (client: TwentyClient) => ({
  async createObjectRecord(namePlural: string, body: unknown) {
    await client.requestJson(`/${namePlural}`, {
      method: "POST",
      body: JSON.stringify(body),
    });

    return true;
  },
});
