import { ApiConfig, ApiRequest, requestJson } from "./http";
import { Keyword, ListMentionsQuery, Mention, MentionList, MentionStatus, Website } from "./types";

export const API_URL = "https://ai.redreplier.com/ai-app/api/v1";
export const APP_URL = "https://redreplier.com";

export function createApi(config: ApiConfig) {
  const send = <T>(request: ApiRequest) => requestJson<T>(config, request);
  const mentionPath = (mentionId: string) => `/mentions/${encodeURIComponent(mentionId)}`;
  const keywordPath = (keywordId: string) => `/keywords/${encodeURIComponent(keywordId)}`;

  return {
    listWebsites: () => send<{ websites: Website[] }>({ path: "/websites" }),
    addKeywords: (websiteId: string, keywords: string[]) =>
      send<Website>({
        method: "POST",
        path: `/websites/${encodeURIComponent(websiteId)}/keywords`,
        body: { keywords },
      }),
    disableKeyword: (keywordId: string) => send<Keyword>({ method: "POST", path: `${keywordPath(keywordId)}/disable` }),
    enableKeyword: (keywordId: string) => send<Keyword>({ method: "POST", path: `${keywordPath(keywordId)}/enable` }),
    listMentions: (listMentionsQuery: ListMentionsQuery) =>
      send<MentionList>({ path: "/mentions", query: listMentionsQuery }),
    updateMentionStatus: (mentionId: string, status: MentionStatus) =>
      send<Mention>({ method: "PATCH", path: `${mentionPath(mentionId)}/status`, body: { status } }),
    explainMention: (mentionId: string) => send<Mention>({ method: "POST", path: `${mentionPath(mentionId)}/explain` }),
  };
}

export type RedReplierApi = ReturnType<typeof createApi>;
