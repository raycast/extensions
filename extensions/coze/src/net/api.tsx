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
import { DEFAULT_REDIRECT_URL, getAPIBase, getClientId, } from "./config";
import { OAuth } from "@raycast/api";

export interface PagedData<T> {
  items: T[];
  has_more: boolean;
}


export interface Conversation {
  id: string;
  created_at: number;
  messages?: ChatV3Message[];
}

const useAPI = async () => {
  const baseURL = await getAPIBase();
  const clientId = await getClientId(baseURL);
  const redirectUrl = DEFAULT_REDIRECT_URL;

  let workspace_owner_type_map: Record<string, string> = {};
  let workspace_icon_map: Record<string, string> = {};

  const defaultPKCEClient = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Coze",
    providerIcon: "coze.svg",
    providerId: "Coze",
    description: "Connect your Coze account\n(Raycast Coze Extension)",
  });

  const isOwner = (workspace_id?: string): boolean => {
    if (!workspace_id) {
      return true;
    }
    if (workspace_owner_type_map && workspace_owner_type_map[workspace_id]) {
      return workspace_owner_type_map[workspace_id] === "owner";
    }
    return false;
  }

  const getPKCEClient = (workspace_id?: string): OAuth.PKCEClient => {
    if (isOwner(workspace_id)) {
      return defaultPKCEClient;
    }
    return new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.Web,
      providerName: `Coze`,
      providerIcon: workspace_icon_map[workspace_id!] || "coze.svg",
      providerId: `Coze-${workspace_id}`,
      description: `Connect your Coze Workspace(${workspace_id})\n(Raycast Coze Extension)`,
    });
  }

  const getEndpoint = (workspace_id?: string): string => {
    const defaultEndpoint = baseURL.includes("bot-open-api") ?
      baseURL.replace("bot-open-api", "bots") + "/api/permission/oauth2" :
      baseURL.replace("api", "www") + "/bots/permission/oauth2";
    if (isOwner(workspace_id)) {
      return defaultEndpoint + "/authorize";
    }
    return defaultEndpoint + `/workspace_id/${workspace_id}/authorize`;
  }

  const getAccessToken = async (code: string, codeVerifier: string): Promise<OAuthToken> => {
    return await getPKCEOAuthToken({
      code,
      baseURL,
      clientId,
      redirectUrl,
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
  }

  const isExpired = (token: OAuth.TokenSet | OAuthToken | undefined): boolean => {
    if (!token) {
      return true
    }
    if ("expires_in" in token && token.expires_in) {
      return token.expires_in < Date.now() / 1000;
    }
    if ("expiresIn" in token && token.expiresIn) {
      return token.expiresIn < Date.now() / 1000;
    }
    return false;
  }

  const authorize = async (space_id?: string): Promise<OAuthToken | undefined> => {
    const pkceClient = getPKCEClient(space_id);
    const tokenSet = await pkceClient.getTokens();
    console.log(`[token]: token:${tokenSet?.accessToken}, refresh: ${tokenSet?.refreshToken}, expired: ${tokenSet?.expiresIn}, expired: ${isExpired(tokenSet)}`)
    if (tokenSet?.refreshToken && isExpired(tokenSet)) {
      const token = await refreshToken(tokenSet.refreshToken);
      console.log(`[token] refresh-result: ${token.access_token}`);
      await pkceClient.setTokens(token);
      return token;
    }
    if (tokenSet?.accessToken && !isExpired(tokenSet)) {
      return {
        access_token: tokenSet.accessToken,
        refresh_token: tokenSet.refreshToken || "",
        expires_in: tokenSet.expiresIn || 0,
      }
    }

    // await pkceClient.removeTokens();

    const authRequest = await pkceClient.authorizationRequest({
      clientId,
      endpoint: getEndpoint(space_id),
      scope: "",
      extraParameters: {
        "redirect_uri": redirectUrl
      }
    })
    const { authorizationCode } = await pkceClient.authorize(authRequest);
    const token = await getAccessToken(authorizationCode, authRequest.codeVerifier)
    await pkceClient.setTokens(token);
    return token;
  }

  const getAPI = async (space_id?: string) => {
    const token = await authorize(space_id);
    return new CozeAPI({ token: token?.access_token || "", baseURL, debug: true })
  }

  const listWorkspaces = async ({
                                  page_num = 1,
                                  page_size = 10,
                                }: {
    page_num?: number,
    page_size?: number,
  }): Promise<PagedData<WorkSpace>> => {
    const coze = await getAPI();
    const workspaces = await coze.workspaces.list({
      page_num,
      page_size,
    });
    // 移除 member 权限
    workspaces.workspaces = workspaces.workspaces.filter((workspace) => {
      return workspace.role_type === "owner";
    })
    // update workspace_owner_type_map
    workspaces.workspaces.forEach((workspace) => {
      workspace_owner_type_map[workspace.id] = workspace.role_type;
      workspace_icon_map[workspace.id] = workspace.icon_url;
    })
    return {
      items: workspaces.workspaces.sort((a, b) => {
        if (a.workspace_type === "personal") return -1;
        if (b.workspace_type === "personal") return 1;
        return 0;
      }),
      has_more: workspaces.total_count > page_num * page_size,
    }
  }

  const listAllWorkspaces = async (): Promise<PagedData<WorkSpace>> => {
    console.log(`[api][listAllWorkspaces]`)
    const coze = await getAPI();
    const page_size = 50;
    let workspaces: WorkSpace[] = [];
    let page_num = 1;
    while (true) {
      console.log(`[api][listAllWorkspaces] page_num: ${page_num}, page_size: ${page_size}`)
      const data = await listWorkspaces({ page_num, page_size });
      workspaces.push(...data.items);
      if (!data.has_more) {
        break;
      }
      page_num++;
    }
    return {
      items: workspaces,
      has_more: false,
    }
  }


  const listBots = async (
    {
                            space_id,
                            page_num = 1,
                            page_size = 10,
                          }: {
    space_id: string,
    page_num?: number,
    page_size?: number,
  }): Promise<PagedData<SimpleBot>> => {
    console.log(`[api][listBots] space_id: ${space_id}, page_num: ${page_num}, page_size: ${page_size}`)
    const pkceClient = getPKCEClient(space_id);
    const token = await authorize(space_id);
    const coze = new CozeAPI({
      token: token?.access_token || "",
      baseURL,
      //   debug: true,
    })
    try {
      const bots = await coze.bots.list({
        space_id,
        page_index: page_num,
        page_size,
      });
      return {
        items: bots.space_bots,
        has_more: bots.total > page_num * page_size,
      }
    } catch (err) {
      if (err instanceof CozeAPI.APIError && err.code === 4100) {
        await pkceClient.removeTokens();
      }
      throw err;
    }
  }


  const listAllBots = async ({
                               space_id,

                             }: {
    space_id: string,
  }): Promise<PagedData<SimpleBot>> => {
    console.log(`[api][listAllBots] space_id: ${space_id}`)
    const coze = await getAPI();
    let page_num = 1;
    const page_size = 20;
    let bots: SimpleBot[] = [];
    while (true) {
      console.log(`[api][listAllBots] space_id: ${space_id}, page_num: ${page_num}, page_size: ${page_size}`)
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
    }
  }

  const listConversations = async (params: {
    bot_id: string,
    page_num?: number,
    page_size?: number,
    space_id?: string,
    with_messages?: boolean,
  }): Promise<PagedData<Conversation>> => {
    console.log(`[api][listConversations] params: ${JSON.stringify(params)}`)
    const coze = await getAPI(params?.space_id);
    const apiUrl = '/v1/conversations';
    // @ts-ignore
    const data = await coze.conversations._client.get(apiUrl, params, false)
    if (params?.with_messages) {
      // @ts-ignore
      data.data.conversations.forEach(async (conversation: Conversation) => {
        const res = await coze.conversations.messages.list(conversation.id, { limit: 2 });
        console.log(`[api][listConversations] conversation.id: ${conversation.id}, messages: ${JSON.stringify(res)}`)
        if (res && res.data) {
          conversation.messages = res.data;
        }
      })
    }
    return {
      // @ts-ignore
      items: data.data.conversations,
      // @ts-ignore
      has_more: data.data.has_more,
    }
  }


  const streamChat = async (
    {
      workspace_id,
      bot_id,
      user_id,
      query,
      on_event,
    }: {
      workspace_id: string,
      bot_id: string,
      user_id: string,
      query: string,
      on_event: (event: StreamChatData) => void,
    }): Promise<void> => {
    const coze = await getAPI(workspace_id)

    const stream = coze.chat.stream({
      bot_id,
      user_id,
      conversation_id: "",
      auto_save_history: true,
      additional_messages: [
        {
          role: RoleType.User,
          type: 'question',
          content: query,
          content_type: 'text',
        }
      ]
    })
    for await (const event of stream) {
      on_event(event);
    }
  }

  return {
    authorize,
    streamChat,
    listWorkspaces,
    listAllWorkspaces,
    listBots,
    listAllBots,
    // createConversation,
    listConversations,
  }
}

export default useAPI;