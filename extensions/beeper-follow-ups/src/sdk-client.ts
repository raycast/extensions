import type BeeperDesktop from "@beeper/desktop-api";
import type { ReplyClient } from "./core";

export function sdkClient(sdk: BeeperDesktop): ReplyClient {
  return {
    searchChats: async (params) => {
      const page = await sdk.chats.search(params);
      return {
        items: page.items,
        hasMore: page.hasMore,
        oldestCursor: page.oldestCursor,
      };
    },
    listMessages: async (id, params) => {
      const page = await sdk.messages.list(id, params);
      return {
        items: page.items,
        hasMore: page.hasMore,
        oldestCursor: page.oldestCursor,
      };
    },
    retrieveChat: (id, params) => sdk.chats.retrieve(id, params),
    // A lost response can follow a successful draft prefill. Do not replay it.
    focus: (params) => sdk.focus(params, { maxRetries: 0 }),
  };
}
