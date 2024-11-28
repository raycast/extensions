import {
  ChatV3Message,
  CozeAPI,
  getPKCEOAuthToken,
  OAuthToken,
  refreshOAuthToken,
  RoleType,
  SimpleBot,
  StreamChatData,
  WorkSpace,
} from "@coze/api";
import { DEFAULT_CN_COZE_CLIENT_ID, DEFAULT_COM_COZE_CLIENT_ID, DEFAULT_REDIRECT_URL, getConfig } from "./config";
// @ts-ignore
import { fetch, OAuth } from "@raycast/api";
import { getUserId } from "../store";

export interface PagedData<T> {
  items: T[];
  has_more: boolean;
}

export interface Conversation {
  id: string;
  created_at: number;
  messages?: ChatV3Message[];
}

const isComBaseURL = (baseURL: string): boolean => {
  return baseURL.includes("coze.com") || baseURL.includes("byteintl.net");
};

const getClientId = async (baseUrl: string): Promise<string> => {
  return isComBaseURL(baseUrl) ? DEFAULT_COM_COZE_CLIENT_ID : DEFAULT_CN_COZE_CLIENT_ID;
};

const replaceAPIBaseURLToPageURL = (baseURL: string): string => {
  if (baseURL.includes("api.")) {
    return baseURL.replace("api.", "www.");
  }
  if (baseURL.includes("bot-open-api.")) {
    return baseURL.replace("bot-open-api.", "bots.");
  }
  return baseURL;
};

const initAPI = async () => {
  const { api_base: baseURL, debug } = await getConfig();
  const clientId = await getClientId(baseURL);

  const workspace_owner_type_map: Record<string, string> = {};
  const workspace_icon_map: Record<string, string> = {};

  const defaultPKCEClient = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Coze",
    providerIcon: "coze.png",
    providerId: "Coze",
    description: "Connect your Coze account\n(Raycast Coze Extension)",
  });

  const log = (msg: string) => {
    if (debug) {
      console.log(msg);
    }
  };

  const isOwner = (workspace_id?: string): boolean => {
    if (!workspace_id) {
      return true;
    }
    if (workspace_owner_type_map && workspace_owner_type_map[workspace_id]) {
      return workspace_owner_type_map[workspace_id] === "owner";
    }
    return false;
  };

  const getPKCEClient = (workspace_id?: string): OAuth.PKCEClient => {
    if (isOwner(workspace_id)) {
      return defaultPKCEClient;
    }
    return new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName: `Coze(${workspace_id})`,
      providerIcon: workspace_icon_map[workspace_id!] || "coze.png",
      providerId: `Coze-${workspace_id}`,
      description: `Connect your Coze Workspace(${workspace_id})\n(Raycast Coze Extension)`,
    });
  };

  const getEndpoint = (workspace_id?: string): string => {
    const pageURL = replaceAPIBaseURLToPageURL(baseURL);
    log(`[api][getEndpoint] baseURL: ${baseURL}, pageURL: ${pageURL}`);
    const defaultEndpoint = pageURL + "/api/permission/oauth2";
    if (isOwner(workspace_id)) {
      return defaultEndpoint + "/authorize";
    }
    return defaultEndpoint + `/workspace_id/${workspace_id}/authorize`;
  };

  const getAccessToken = async (code: string, codeVerifier: string): Promise<OAuthToken> => {
    return await getPKCEOAuthToken({
      code,
      baseURL,
      clientId,
      redirectUrl: DEFAULT_REDIRECT_URL,
      codeVerifier,
    });
  };

  const refreshToken = async (refreshToken: string): Promise<OAuthToken> => {
    return await refreshOAuthToken({
      refreshToken,
      baseURL,
      clientId,
      clientSecret: "",
    });
  };

  const isExpired = (token: OAuth.TokenSet | OAuthToken | undefined): boolean => {
    if (!token) {
      return true;
    }
    if ("expires_in" in token && token.expires_in) {
      return token.expires_in < Date.now() / 1000;
    }
    if ("expiresIn" in token && token.expiresIn) {
      return token.expiresIn < Date.now() / 1000;
    }
    return false;
  };

  const authorize = async (space_id?: string): Promise<OAuthToken | undefined> => {
    const pkceClient = getPKCEClient(space_id);
    const tokenSet = await pkceClient.getTokens();
    log(
      `[token]: token: ${tokenSet?.accessToken}, refresh: ${tokenSet?.refreshToken}, expired: ${tokenSet?.expiresIn}, expired: ${isExpired(tokenSet)}`,
    );
    if (tokenSet?.refreshToken && isExpired(tokenSet)) {
      try {
        const token = await refreshToken(tokenSet.refreshToken);
        log(`[token][refresh] success: ${token.access_token}`);
        await pkceClient.setTokens(token);
        return token;
      } catch (err) {
        log(`[token][refresh] error: ${err}`);
        await pkceClient.removeTokens();
        return undefined;
      }
    }
    if (tokenSet?.accessToken && !isExpired(tokenSet)) {
      return {
        access_token: tokenSet.accessToken,
        refresh_token: tokenSet.refreshToken || "",
        expires_in: tokenSet.expiresIn || 0,
      };
    }

    const authRequest = await pkceClient.authorizationRequest({
      clientId,
      endpoint: getEndpoint(space_id),
      scope: "",
      extraParameters: {
        redirect_uri: DEFAULT_REDIRECT_URL,
      },
    });
    log(`[token][pkce][authorize] authRequest: ${authRequest.toURL()}}`);
    const { authorizationCode } = await pkceClient.authorize(authRequest);
    try {
      const token = await getAccessToken(authorizationCode, authRequest.codeVerifier);
      log(
        `[token][pkce][getAccessToken] success: ${JSON.stringify({
          authorizationCode,
          codeVerifier: authRequest.codeVerifier,
          token,
        })}`,
      );
      await pkceClient.setTokens(token);
      return token;
    } catch (err) {
      log(`[token][pkce][getAccessToken] error: ${err}`);
    }
  };

  const getAPI = async (space_id?: string): Promise<CozeAPI | undefined> => {
    const token = await authorize(space_id);
    if (!token?.access_token) {
      return undefined;
    }
    return new CozeAPI({ token: token?.access_token || "", baseURL });
  };

  const listWorkspaces = async ({
    page_num = 1,
    page_size = 10,
  }: {
    page_num?: number;
    page_size?: number;
  }): Promise<PagedData<WorkSpace>> => {
    const coze = await getAPI();
    if (!coze) {
      return {
        items: [],
        has_more: false,
      };
    }
    const workspaces = await coze.workspaces.list({
      page_num,
      page_size,
    });
    // update workspace_owner_type_map
    workspaces.workspaces.forEach((workspace) => {
      workspace_owner_type_map[workspace.id] = workspace.role_type;
      workspace_icon_map[workspace.id] = workspace.icon_url;
    });
    return {
      items: workspaces.workspaces.sort((a, b) => {
        if (a.workspace_type === "personal") return -1;
        if (b.workspace_type === "personal") return 1;
        return 0;
      }),
      has_more: workspaces.total_count > page_num * page_size,
    };
  };

  const listAllWorkspaces = async (): Promise<PagedData<WorkSpace>> => {
    const page_size = 50;
    const workspaces: WorkSpace[] = [];
    let page_num = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      log(`[api][listAllWorkspaces] start, page_num: ${page_num}, page_size: ${page_size}`);
      const data = await listWorkspaces({ page_num, page_size });
      log(
        `[api][listAllWorkspaces] success, page_num: ${page_num}, page_size: ${page_size}, data: ${JSON.stringify(data)}`,
      );
      workspaces.push(...data.items);
      if (!data.has_more) {
        break;
      }
      page_num++;
    }
    return {
      items: workspaces,
      has_more: false,
    };
  };

  const listBots = async ({
    space_id,
    page_num = 1,
    page_size = 10,
  }: {
    space_id: string;
    page_num?: number;
    page_size?: number;
  }): Promise<PagedData<SimpleBot>> => {
    const pkceClient = getPKCEClient(space_id);
    const token = await authorize(space_id);
    const coze = new CozeAPI({
      token: token?.access_token || "",
      baseURL,
    });

    try {
      log(`[api][listBots] start, space_id: ${space_id}, page_num: ${page_num}, page_size: ${page_size}`);
      const bots = await coze.bots.list({
        space_id,
        page_index: page_num,
        page_size,
      });
      log(
        `[api][listBots] success, space_id: ${space_id}, page_num: ${page_num}, page_size: ${page_size}, data: ${JSON.stringify(bots)}`,
      );
      return {
        items: bots.space_bots,
        has_more: bots.total > page_num * page_size,
      };
    } catch (err) {
      log(`[api][listBots] error: ${err}`);
      if (err instanceof CozeAPI.APIError && err.code === 4100) {
        await pkceClient.removeTokens();
      }
      throw err;
    }
  };

  const listAllBots = async ({ space_id }: { space_id: string }): Promise<PagedData<SimpleBot>> => {
    let page_num = 1;
    const page_size = 20;
    const bots: SimpleBot[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await listBots({
        space_id,
        page_num,
        page_size,
      });
      bots.push(...data.items);
      if (!data.has_more) {
        break;
      }
      page_num++;
    }
    return {
      items: bots,
      has_more: false,
    };
  };

  const createConversation = async ({
    workspaceId,
    botId,
  }: {
    workspaceId: string;
    botId: string;
  }): Promise<Conversation | undefined> => {
    const coze = await getAPI(workspaceId);
    if (!coze) {
      return undefined;
    }
    const apiUrl = "/v1/conversation/create";
    log(`[api][createConversation] start, workspaceId: ${workspaceId}, botId: ${botId}`);
    const res: {
      data: Conversation;
      // @ts-ignore
    } = await coze.conversations._client.post(apiUrl, { bot_id: botId }, false);
    log(
      `[api][createConversation] success, workspaceId: ${workspaceId}, botId: ${botId}, data: ${JSON.stringify(res.data)}`,
    );
    return res.data;
  };

  const listConversations = async (params: {
    bot_id: string;
    page_num?: number;
    page_size?: number;
    space_id?: string;
    with_messages?: boolean;
  }): Promise<PagedData<Conversation>> => {
    const coze = await getAPI(params?.space_id);
    if (!coze) {
      return {
        items: [],
        has_more: false,
      };
    }
    const apiUrl = "/v1/conversations";
    log(`[api][listConversations] start, params: ${JSON.stringify(params)}`);
    const data: {
      data: {
        conversations: Conversation[];
        has_more: boolean;
      };
      // @ts-ignore
    } = await coze.conversations._client.get(apiUrl, params, false);
    log(`[api][listConversations] success, params: ${JSON.stringify(params)}, data: ${JSON.stringify(data)}`);
    if (params?.with_messages) {
      for (const conversation of data.data.conversations) {
        const res = await coze.conversations.messages.list(conversation.id, { limit: 2 });
        log(`[api][listConversations] conversation.id: ${conversation.id}, messages: ${JSON.stringify(res)}`);
        if (res && res.data) {
          conversation.messages = res.data;
        }
      }
    }

    return {
      items: data.data.conversations,
      has_more: data.data.has_more,
    };
  };

  const streamChat = async ({
    workspaceId,
    botId,
    query,
    conversationId,
    on_event,
  }: {
    workspaceId: string;
    botId: string;
    query: string;
    conversationId?: string;
    on_event: (event: StreamChatData) => Promise<void>;
  }): Promise<void> => {
    const coze = await getAPI(workspaceId);
    if (!coze) {
      return;
    }
    const userId = await getUserId();
    log(
      `[api][streamChat] start, workspaceId: ${workspaceId}, botId: ${botId}, conversationId: ${conversationId}, userId: ${userId}`,
    );
    const stream = coze.chat.stream(
      {
        bot_id: botId,
        user_id: userId,
        conversation_id: conversationId || undefined,
        auto_save_history: true,
        additional_messages: [
          {
            role: RoleType.User,
            type: "question",
            content: query,
            content_type: "text",
          },
        ],
      },
      {
        adapter: fetch,
      },
    );
    for await (const event of stream) {
      log(`[api][streamChat] event: ${JSON.stringify(event)}`);
      await on_event(event);
    }
  };

  const listMessages = async ({
    conversation_id,
    signal,
  }: {
    conversation_id: string;
    signal?: AbortSignal;
  }): Promise<ChatV3Message[]> => {
    const coze = await getAPI();
    if (!coze) {
      return [];
    }
    let after_id: string = "0";
    const messages: ChatV3Message[] = [];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      log(`[api][listMessages] start, conversation_id: ${conversation_id}, after_id: ${after_id}`);
      const res = await coze.conversations.messages.list(
        conversation_id,
        {
          order: "desc",
          after_id,
          limit: 50,
        },
        {
          signal,
        },
      );
      log(`[api][listMessages] success, data: ${JSON.stringify(res)}`);
      messages.push(...res.data);
      if (res.has_more) {
        after_id = res.last_id;
      } else {
        break;
      }
    }
    return messages;
  };

  return {
    log,
    authorize,
    streamChat,
    listWorkspaces,
    listAllWorkspaces,
    listBots,
    listAllBots,
    createConversation,
    listConversations,
    listMessages,
  };
};

export type APIInstance = Awaited<ReturnType<typeof initAPI>>;

export default initAPI;
