import { getPreferenceValues } from "@raycast/api";
import { Contact, Conversation, Inbox, Integration, ListResult, Message, Portal } from "./types";

class Chatwoot {
  private url: string;
  private accessToken: string;
  private accountId: string;
  public contacts: ContactsService;
  public conversations: ConversationsService;
  public inboxes: InboxesService;
  public integrations: IntegrationsService;
  public messages: MessagesService;
  public portals: PortalsService;

  constructor(url: string, accessToken: string, accountId: string) {
    this.url = url;
    this.accessToken = accessToken;
    this.accountId = accountId;
    this.contacts = new ContactsService(this);
    this.conversations = new ConversationsService(this);
    this.inboxes = new InboxesService(this);
    this.integrations = new IntegrationsService(this);
    this.messages = new MessagesService(this);
    this.portals = new PortalsService(this);
  }

  public buildUrl(route: string) {
    return new URL(route, this.url);
  }

  protected async request<T>(endpoint: string, options?: RequestInit) {
    const response = await fetch(this.buildUrl(`api/v1/accounts/${this.accountId}/${endpoint}`), {
      ...options,
      headers: {
        api_access_token: this.accessToken,
        "Content-Type": "application/json",
      },
    });
    if (!response.headers.get("content-type")?.includes("application/json")) throw new Error(response.statusText);
    const result = await response.json();
    if (!response.ok) {
      const errorResult = result as { error: string } | { message: string; attributes: string[] };
      throw new Error("error" in errorResult ? errorResult.error : errorResult.message);
    }
    return result as T;
  }
}

class ContactsService {
  constructor(private client: Chatwoot) {}
  async create(props: { contact: Partial<Contact> }) {
    return this.client["request"]<Contact>("contacts", {
      method: "POST",
      body: JSON.stringify(props.contact),
    });
  }
  async list(props: { page: number }) {
    return this.client["request"]<ListResult<Contact>>(`contacts?page=${props.page}`);
  }
}
class ConversationsService {
  constructor(private client: Chatwoot) {}
  async list() {
    return this.client["request"]<{ data: { payload: Conversation[] } }>("conversations");
  }
}
class InboxesService {
  constructor(private client: Chatwoot) {}
  async list() {
    return this.client["request"]<{ payload: Inbox[] }>("inboxes");
  }
}
class IntegrationsService {
  constructor(private client: Chatwoot) {}
  async list() {
    return this.client["request"]<ListResult<Integration>>("integrations/apps");
  }
}
class MessagesService {
  constructor(private client: Chatwoot) {}
  async create(props: { conversationId: number; message: Partial<Message> }) {
    return this.client["request"]<Message>(`conversations/${props.conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify(props.message),
    });
  }
  async list(props: { conversationId: number }) {
    return this.client["request"]<{ payload: Message[] }>(`conversations/${props.conversationId}/messages`);
  }
}
class PortalsService {
  constructor(private client: Chatwoot) {}
  async create(props: { portal: Partial<Portal> }) {
    return this.client["request"]<Portal>("portals", {
      method: "POST",
      body: JSON.stringify(props.portal),
    });
  }
  async list() {
    return this.client["request"]<{ meta: { current_page: number; portals_count: number }; payload: Portal[] }>(
      "portals",
    );
  }
}

const { chatwoot_url, access_token, account_id } = getPreferenceValues<Preferences>();
export const chatwoot = new Chatwoot(chatwoot_url, access_token, account_id);
