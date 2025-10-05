import { getPreferenceValues } from "@raycast/api";
import { Contact, Conversation, Inbox, Integration, ListResult } from "./types";

class Chatwoot {
    private url: string;
    private accessToken: string;
    private accountId: string;
    public contacts: ContactsService;
    public conversations: ConversationsService;
    public inboxes: InboxesService;
    public integrations: IntegrationsService;

    constructor(url: string, accessToken: string, accountId: string) {
        this.url = url;
        this.accessToken = accessToken;
        this.accountId = accountId;
        this.contacts = new ContactsService(this);
        this.conversations = new ConversationsService(this);
        this.inboxes = new InboxesService(this);
        this.integrations = new IntegrationsService(this);
    }

    public buildUrl(route: string) {
        return new URL(route, this.url);
    }

    protected async request<T> (endpoint: string, options?: RequestInit) {
        const response = await fetch(this.buildUrl(`api/v1/accounts/${this.accountId}/${endpoint}`), {
            ...options,
            headers : {
                api_access_token: this.accessToken,
                "Content-Type": "application/json"
            }
        })
        if (!response.headers.get("content-type")?.includes("json")) throw new Error(response.statusText);
        const result = await response.json();
        if (!response.ok) throw new Error((result as {error:string}).error);
        return result as T;
    }
}

class ContactsService {
    constructor(private client: Chatwoot) {}
    async list(page: string) {
        return this.client["request"]<ListResult<Contact>>(`contacts?page=${page}`);
    }
}
class ConversationsService {
    constructor(private client: Chatwoot) {}
    async list() {
        return this.client["request"]<{data: {payload: Conversation[]}}>("conversations");
    }
}
class InboxesService {
    constructor(private client: Chatwoot) {}
    async list() {
        return this.client["request"]<{payload: Inbox[]}>("inboxes");
    }
}
class IntegrationsService {
    constructor(private client: Chatwoot) {}
    async list() {
        return this.client["request"]<ListResult<Integration>>("integrations/apps");
    }
}

const {chatwoot_url, access_token,account_id} = getPreferenceValues<Preferences>()
export const chatwoot = new Chatwoot(chatwoot_url, access_token, account_id);